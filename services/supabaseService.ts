import { supabase } from '../lib/supabase';
import type { Post, Profile, Comment } from '../types';

// NOTE: Assumes you have a 'profiles' table with public user info linked to 'auth.users'.
// If you are getting errors, ensure you have enabled read access on your 'posts' and 'profiles' tables via RLS policies in Supabase.

export const getPosts = async (): Promise<Post[]> => {
    const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (postsError) {
        console.error('Error fetching posts:', postsError.message);
        return [];
    }
    
    const authorIds = [...new Set(postsData.map(p => p.author_id))];
    if (authorIds.length === 0) return [];

    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, image')
        .in('id', authorIds);

    if (profilesError) {
        console.error('Error fetching author profiles:', profilesError.message);
        // Fallback to showing posts with unknown authors
        return postsData.map(post => ({
            ...post,
            author: { id: post.author_id, name: 'Unknown Author' }
        })) as unknown as Post[];
    }
    
    const profilesById = new Map(profilesData.map(p => [p.id, p]));

    const postsWithAuthors = postsData.map(post => ({
        ...post,
        author: profilesById.get(post.author_id) || { id: post.author_id, name: 'Unknown Author' }
    }));
    
    return postsWithAuthors as unknown as Post[];
}

export const getPostById = async (id: string): Promise<Post | null> => {
    const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();
        
    if (postError) {
        console.error(`Error fetching post by ID (${id}):`, postError.message);
        return null;
    }
    if (!postData) return null;

    const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('id, name, image')
        .eq('id', postData.author_id)
        .single();
    
    if (authorError) {
        console.warn('Could not fetch author for post:', authorError.message);
    }

    const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

    if (commentsError) {
        console.error('Error fetching comments:', commentsError.message);
        return { ...postData, author: authorData || { id: postData.author_id, name: 'Unknown' }, comments: [] } as unknown as Post;
    }
    
    const userIds = [...new Set(commentsData.map(c => c.user_id))];
    let usersById = new Map();
    if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
            .from('profiles')
            .select('id, name, image')
            .in('id', userIds);
        
        if (usersError) {
            console.warn('Could not fetch users for comments:', usersError.message);
        } else {
            usersById = new Map(usersData.map(u => [u.id, u]));
        }
    }
    
    const commentsWithUsers = commentsData.map(comment => ({
        ...comment,
        user: usersById.get(comment.user_id) || { id: comment.user_id, name: 'Unknown' }
    }));

    return {
        ...postData,
        author: authorData || { id: postData.author_id, name: 'Unknown' },
        comments: commentsWithUsers
    } as unknown as Post;
}

export const getPostsByAuthor = async (authorId: string): Promise<Post[]> => {
    const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('id, name, image')
        .eq('id', authorId)
        .single();

    if (authorError) {
        console.error('Error fetching author profile:', authorError.message);
        return [];
    }

    const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', authorId)
        .order('created_at', { ascending: false });

    if (postsError) {
        console.error('Error fetching posts by author:', postsError.message);
        return [];
    }
    
    return postsData.map(post => ({
        ...post,
        author: authorData
    })) as unknown as Post[];
}

export const createPost = async (postData: { title: string; content: string; summary: string; author_id: string }): Promise<Post> => {
    const { data, error } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

    if (error) {
        console.error('Error creating post:', error.message);
        throw new Error('Could not create post.');
    }
    
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.author_id)
        .single();

    if (profileError) {
        console.error('Error fetching profile for new post:', profileError.message);
        return { ...data, author: { id: data.author_id, name: 'Unknown' } } as unknown as Post;
    }
    
    return { ...data, author: profile } as unknown as Post;
}

export const searchPosts = async (query: string): Promise<Post[]> => {
    if (!query) return [];
    
    const formattedQuery = query.trim().split(/\s+/).join(' | ');

    const [titleSearch, contentSearch] = await Promise.all([
        supabase.from('posts').select('*').textSearch('title', formattedQuery, { type: 'plain' }),
        supabase.from('posts').select('*').textSearch('content', formattedQuery, { type: 'plain' })
    ]);
    
    if (titleSearch.error) console.error('Error searching post titles:', titleSearch.error.message);
    if (contentSearch.error) console.error('Error searching post content:', contentSearch.error.message);
    
    const titleResults = titleSearch.data || [];
    const contentResults = contentSearch.data || [];
    const postsData = Array.from(new Map([...titleResults, ...contentResults].map(post => [post.id, post])).values());

    if (postsData.length === 0) return [];
    
    const authorIds = [...new Set(postsData.map(p => p.author_id))];
    
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, image')
        .in('id', authorIds);

    if (profilesError) {
        console.warn('Error fetching author profiles for search results:', profilesError.message);
        return postsData.map(post => ({
            ...post,
            author: { id: post.author_id, name: 'Unknown Author' }
        })) as unknown as Post[];
    }
    
    const profilesById = new Map(profilesData.map(p => [p.id, p]));

    return postsData.map(post => ({
        ...post,
        author: profilesById.get(post.author_id) || { id: post.author_id, name: 'Unknown Author' }
    })) as unknown as Post[];
}

export const addComment = async (commentData: { postId: string; user_id: string; text: string }): Promise<Comment> => {
    const { data, error } = await supabase
        .from('comments')
        .insert([{
            post_id: commentData.postId,
            user_id: commentData.user_id,
            text: commentData.text,
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding comment:', error.message);
        throw new Error('Could not add comment.');
    }
    return data as unknown as Comment;
}