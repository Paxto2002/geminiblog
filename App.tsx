import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getPosts, getPostById, searchPosts, getPostsByAuthor, createPost, addComment } from './services/supabaseService';
import type { Post } from './types';
import {
  ThemeProvider,
  AuthProvider,
  useAuth,
  Layout,
  PostCard,
  Spinner,
  Input,
  MarkdownRenderer,
  Editor,
  Button
} from './components';

// --- Page Components ---

const HomePage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchResults, setSearchResults] = useState<Post[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const data = await getPosts();
            setPosts(data);
            setLoading(false);
        };
        fetchPosts();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            setSearchResults(null);
            return;
        }
        setLoading(true);
        const results = await searchPosts(searchTerm);
        setSearchResults(results);
        setLoading(false);
    };

    const displayedPosts = searchResults !== null ? searchResults : posts;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center my-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Stories & Ideas</h1>
                <p className="mt-4 text-lg text-muted-foreground dark:text-dark-muted-foreground">The latest from the Gemini Blog community.</p>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto mb-12">
                <Input 
                  type="text" 
                  placeholder="Search for posts, authors, or topics..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <Button type="submit">Search</Button>
            </form>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            ) : (
                <div className="space-y-4">
                    {displayedPosts.length > 0 ? (
                        displayedPosts.map(post => <PostCard key={post.id} post={post} />)
                    ) : (
                        <p className="text-center text-muted-foreground dark:text-dark-muted-foreground">No posts found.</p>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const PostPage = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPost = useCallback(async () => {
      if(!id) return;
      setLoading(true);
      const data = await getPostById(id);
      setPost(data);
      setLoading(false);
    }, [id]);

    useEffect(() => {
        fetchPost();
    }, [fetchPost]);
    
    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!commentText.trim() || !user || !id) return;

        setIsSubmitting(true);
        await addComment({ postId: id, user_id: user.id, text: commentText });
        setCommentText('');
        setIsSubmitting(false);
        fetchPost(); // Re-fetch post to show new comment
    };

    if (loading) return <div className="flex justify-center items-center h-96"><Spinner size="lg"/></div>;
    if (!post) return <div>Post not found.</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{post.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-dark-muted-foreground mt-4">
                    <img src={post.author.image || `https://ui-avatars.com/api/?name=${post.author.name}&background=random`} alt={post.author.name || 'Author avatar'} className="h-8 w-8 rounded-full" />
                    <span>{post.author.name}</span>
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>
            <MarkdownRenderer content={post.content} />

            <div className="mt-16">
                <h2 className="text-2xl font-bold border-b pb-2 mb-6">Comments ({post.comments?.length || 0})</h2>
                {user ? (
                    <form onSubmit={handleCommentSubmit} className="mb-8 flex flex-col gap-4">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add your comment..."
                        className="w-full p-3 rounded-md border bg-secondary/50 dark:bg-dark-secondary/50 focus:outline-none focus:ring-2 ring-primary dark:ring-dark-primary min-h-[100px]"
                      />
                      <div className="flex justify-end">
                        <Button type="submit" isLoading={isSubmitting}>Post Comment</Button>
                      </div>
                    </form>
                ) : (
                  <p className="text-muted-foreground dark:text-dark-muted-foreground">Please sign in to leave a comment.</p>
                )}

                <div className="space-y-6">
                    {post.comments?.map(comment => (
                        <div key={comment.id} className="flex gap-4">
                            <img src={comment.user.image || `https://ui-avatars.com/api/?name=${comment.user.name}&background=random`} alt={comment.user.name || 'User avatar'} className="h-10 w-10 rounded-full mt-1" />
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-semibold">{comment.user.name}</span>
                                    <span className="text-xs text-muted-foreground dark:text-dark-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                                <p className="mt-1">{comment.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const EditorPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    
    useEffect(() => {
        if (!user) {
            // This is a quick redirect, a better UX might be a modal or a disabled page
            navigate('/');
        }
    }, [user, navigate]);

    const handlePublish = async () => {
        if (!title.trim() || !content.trim() || !user) {
            alert("Title and content are required.");
            return;
        }
        setIsPublishing(true);
        const newPost = await createPost({ title, content, summary, author_id: user.id });
        setIsPublishing(false);
        navigate(`/post/${newPost.id}`);
    };

    if (!user) return <div className="flex justify-center items-center h-96"><Spinner size="lg"/></div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Editor
                title={title}
                setTitle={setTitle}
                content={content}
                setContent={setContent}
                summary={summary}
                setSummary={setSummary}
                onPublish={handlePublish}
                isPublishing={isPublishing}
            />
        </motion.div>
    );
};

const DashboardPage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      const fetchUserPosts = async (authorId: string) => {
        setLoading(true);
        const data = await getPostsByAuthor(authorId);
        setPosts(data);
        setLoading(false);
      };

      if (user) {
        fetchUserPosts(user.id);
      } else {
        navigate('/');
      }
    }, [user, navigate]);

    if (!user) return null;
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <h1 className="text-3xl font-bold tracking-tight mb-8">My Dashboard</h1>
             {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Spinner />
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.length > 0 ? (
                        posts.map(post => <PostCard key={post.id} post={post} />)
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <h2 className="text-xl font-semibold">No posts yet.</h2>
                            <p className="text-muted-foreground dark:text-dark-muted-foreground mt-2">Start writing your first story!</p>
                            <Button onClick={() => navigate('/editor')} className="mt-4">Create Post</Button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
    );
};

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <AuthProvider>
            <Layout>
                <AppRoutes />
            </Layout>
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  );
}