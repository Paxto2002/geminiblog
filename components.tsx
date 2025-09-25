import React, { useState, useEffect, useContext, createContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import type { Post, Profile } from './types';
import { generateSummary } from './services/geminiService';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';


// --- Theme Context & Hook ---
type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = storedTheme || preferredTheme;
    setTheme(initialTheme);
  }, []);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// --- Auth Context & Hook (Supabase) ---
type AuthContextType = {
  session: Session | null;
  user: Profile | null;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const setAuthData = async (session: Session | null) => {
            setSession(session);
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (profile) {
                    setUser(profile as Profile);
                } else {
                    // This is a fallback for when a user is authenticated but has no profile yet.
                    // This can happen if the `handle_new_user` trigger hasn't run or failed.
                    console.warn(`No profile found for user ${session.user.id}. Using fallback data.`);
                    setUser({
                        id: session.user.id,
                        name: session.user.email || 'New User',
                        image: undefined,
                    });
                }
            } else {
                setUser(null);
            }
        };

        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await setAuthData(session);
            setLoading(false);
        };
        
        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await setAuthData(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
    };
    
    const value = { session, user, logout };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


// --- Icons ---
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9 1.9 5.8 1.9-5.8 5.8-1.9-5.8-1.9Z"/></svg>;

// --- UI Components ---
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  return (
    <div className={`animate-spin rounded-full border-4 border-primary/20 border-t-primary dark:border-dark-primary/20 dark:border-t-dark-primary ${sizeClasses[size]}`}></div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost', isLoading?: boolean }> = ({ children, className, variant = 'primary', isLoading = false, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-dark-primary dark:text-dark-primary-foreground dark:hover:bg-dark-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-dark-secondary dark:text-dark-secondary-foreground dark:hover:bg-dark-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-dark-accent dark:hover:text-dark-accent-foreground",
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className} px-4 py-2`} {...props} disabled={isLoading || props.disabled}>
      {isLoading ? <Spinner size="sm" /> : children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
    return (
        <input className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-input dark:bg-dark-background dark:ring-offset-dark-background dark:placeholder:text-dark-muted-foreground dark:focus-visible:ring-dark-ring ${className}`} {...props} />
    );
};

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <Button variant="ghost" onClick={toggleTheme} className="px-2">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </Button>
    );
};

export const UserNav = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Check your email for the login link!');
        }
        setLoading(false);
    };

    if (user) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                <img src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=random`} alt={user.name} className="h-8 w-8 rounded-full" />
                <Button variant="secondary" onClick={handleLogout}>Logout</Button>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2">
            <form onSubmit={handleLogin} className="flex items-center gap-2">
                <Input 
                    type="email" 
                    placeholder="your@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-40 sm:w-auto"
                    disabled={loading}
                />
                <Button type="submit" isLoading={loading}>Sign In</Button>
            </form>
             {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
    );
};

export const Navbar = () => {
    const { user } = useAuth();
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm dark:border-dark-border/40 dark:bg-dark-background/95">
            <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
                <Link to="/" className="flex items-center gap-2">
                  <SparklesIcon />
                  <span className="font-bold text-lg">Gemini Blog</span>
                </Link>
                <div className="flex items-center gap-4">
                    {user && (
                      <>
                        <Link to="/editor" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary dark:text-dark-muted-foreground dark:hover:text-dark-primary">New Post</Link>
                        <Link to="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary dark:text-dark-muted-foreground dark:hover:text-dark-primary">Dashboard</Link>
                      </>
                    )}
                    <ThemeToggle />
                    <UserNav />
                </div>
            </div>
        </header>
    );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="container mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
    );
};

export const PostCard: React.FC<{ post: Post }> = ({ post }) => {
    return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="border-b border-border dark:border-dark-border py-8"
        >
            <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-dark-muted-foreground mb-2">
                <img src={post.author.image || `https://ui-avatars.com/api/?name=${post.author.name}&background=random`} alt={post.author.name} className="h-6 w-6 rounded-full" />
                <span>{post.author.name}</span>
                <span>·</span>
                <span>{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <Link to={`/post/${post.id}`}>
                <h2 className="text-2xl font-bold tracking-tight hover:underline">{post.title}</h2>
                <p className="text-muted-foreground dark:text-dark-muted-foreground mt-2">{post.summary}</p>
            </Link>
        </motion.div>
    );
};

export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div className="prose dark:prose-invert lg:prose-xl max-w-none">
            <ReactMarkdown
                components={{
                    h1: ({node, ...props}) => <h1 className="text-4xl font-extrabold tracking-tight" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-3xl font-bold tracking-tight border-b pb-2" {...props} />,
                    p: ({node, ...props}) => <p className="leading-7" {...props} />,
                    a: ({node, ...props}) => <a className="text-primary dark:text-dark-primary underline" {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export const Editor: React.FC<{
    title: string;
    setTitle: (title: string) => void;
    content: string;
    setContent: (content: string) => void;
    summary: string;
    setSummary: (summary: string) => void;
    onPublish: () => void;
    isPublishing: boolean;
}> = ({ title, setTitle, content, setContent, summary, setSummary, onPublish, isPublishing }) => {
    const [isSummarizing, setIsSummarizing] = useState(false);

    const handleSummarize = async () => {
        if (!content) return;
        setIsSummarizing(true);
        try {
            const generated = await generateSummary(content);
            setSummary(generated);
        } catch (error) {
            console.error(error);
            setSummary("Failed to generate summary.");
        } finally {
            setIsSummarizing(false);
        }
    };

    return (
        <div className="space-y-6">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post Title..."
                className="text-4xl font-extrabold w-full focus:outline-none bg-transparent"
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[60vh]">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your story here... (Markdown supported)"
                    className="w-full h-full p-4 rounded-md border bg-secondary/50 dark:bg-dark-secondary/50 focus:outline-none focus:ring-2 ring-primary dark:ring-dark-primary"
                />
                <div className="w-full h-full p-4 rounded-md border overflow-y-auto">
                   <MarkdownRenderer content={content || "## Preview"} />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <Button onClick={handleSummarize} isLoading={isSummarizing} variant="secondary">
                  <SparklesIcon /> <span className="ml-2">Summarize with AI</span>
                </Button>
                <Button onClick={onPublish} isLoading={isPublishing}>Publish</Button>
            </div>
             <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="AI Generated Summary will appear here..."
                className="w-full p-4 rounded-md border bg-secondary/50 dark:bg-dark-secondary/50 focus:outline-none focus:ring-2 ring-primary dark:ring-dark-primary h-24"
            />
        </div>
    );
};