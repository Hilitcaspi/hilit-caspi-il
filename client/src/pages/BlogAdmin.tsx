import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Plus, Edit2, Trash2, Eye, ArrowRight } from "lucide-react";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  metaDescription?: string | null;
  tags?: string | null;
  isPublished: boolean;
  publishedAt?: number | null;
  createdAt: number;
  updatedAt: number;
};

function normalizeTags(value?: string | null): string {
  if (!value) return "";
  let tags: unknown = value;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) tags = parsed;
  } catch {
    // Existing records normally store comma-separated tags.
  }
  const items = Array.isArray(tags) ? tags : value.split(",");
  return Array.from(new Set(items.filter((tag): tag is string => typeof tag === "string")
    .map(tag => tag.trim()).filter(Boolean))).join(",");
}

function BlogPostForm({ post, onSave, onCancel }: {
  post?: BlogPost | null;
  onSave: (data: Partial<BlogPost>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [tags, setTags] = useState(normalizeTags(post?.tags));
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);

  const generateSlug = (t: string) =>
    t.trim()
      .toLowerCase()
      .replace(/[\u0590-\u05FF]/g, (c) => c) // keep Hebrew
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0590-\u05FF-]/g, "")
      .slice(0, 80);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!post?.id) setSlug(generateSlug(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !excerpt.trim() || !content.trim()) {
      toast.error("נא למלא את כל השדות החובה");
      return;
    }
    onSave({ id: post?.id, title: title.trim(), slug: slug.trim(), excerpt: excerpt.trim(),
      content, coverImage: coverImage.trim(), metaDescription, tags: normalizeTags(tags), isPublished });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <label className="block text-sm font-medium text-[#191265] mb-1">כותרת *</label>
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#191265]"
          placeholder="כותרת המאמר"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#191265] mb-1">Slug (URL) *</label>
        <input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-[#191265]"
          dir="ltr"
          placeholder="my-article-slug"
          required
        />
        <p className="text-xs text-gray-400 mt-1">כתובת המאמר: /blog/{slug}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#191265] mb-1">תקציר (2-3 משפטים) *</label>
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#191265] min-h-[80px] resize-none"
          placeholder="תקציר קצר שמופיע בדף הבלוג..."
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#191265] mb-1">תוכן המאמר (HTML) *</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#191265] min-h-[300px] resize-y font-mono"
          placeholder="<h2>כותרת</h2><p>תוכן...</p>"
          required
          dir="rtl"
        />
        <p className="text-xs text-gray-400 mt-1">ניתן להשתמש ב-HTML: &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt;</p>
      </div>
      <div>
        <label htmlFor="blog-cover-image" className="block text-sm font-medium text-[#191265] mb-1">תמונת שער (כתובת URL)</label>
        <input
          id="blog-cover-image"
          value={coverImage}
          onChange={e => setCoverImage(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-[#191265]"
          dir="ltr"
          placeholder="https://... או /manus-storage/..."
        />
        <p className="text-xs text-gray-400 mt-1">תמונת המאמר שמופיעה בבלוג ובשיתוף קישור. השאירי ריק להסרת תמונה.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#191265] mb-1">Meta Description (לגוגל, עד 160 תווים)</label>
        <input
          value={metaDescription}
          onChange={e => setMetaDescription(e.target.value.slice(0, 160))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#191265]"
          placeholder="תיאור קצר לגוגל..."
          maxLength={160}
        />
        <p className="text-xs text-gray-400 mt-1">{metaDescription.length}/160 תווים</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#191265] mb-1">תגיות (מופרדות בפסיק)</label>
        <input
          value={tags}
          onChange={e => setTags(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#191265]"
          placeholder="זוגיות,אהבה,דייטינג"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={e => setIsPublished(e.target.checked)}
            className="w-4 h-4 accent-[#191265]"
          />
          <span className="text-sm font-medium text-[#191265]">פרסם מיידית</span>
        </label>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="text-sm">
          ביטול
        </Button>
        <Button type="submit" className="bg-[#191265] hover:bg-[#1800ad] text-white text-sm">
          {post?.id ? "עדכן מאמר" : isPublished ? "פרסם מאמר" : "שמור טיוטה"}
        </Button>
      </div>
    </form>
  );
}

export default function BlogAdmin() {
  const { user, loading } = useAuth();
  const [editingPost, setEditingPost] = useState<number | null | "new">(null);
  const isAdmin = user?.role === "admin";

  const { data: posts, refetch, isLoading: postsLoading, error: postsError } = trpc.blog.listAdmin.useQuery(
    { limit: 50 }, { enabled: !loading && isAdmin },
  );
  const editingId = typeof editingPost === "number" ? editingPost : null;
  const { data: fullPost, isLoading: editLoading, error: editError } = trpc.blog.getForEdit.useQuery(
    { id: editingId ?? 1 }, { enabled: !loading && isAdmin && editingId !== null },
  );
  const utils = trpc.useUtils();
  const upsert = trpc.blog.upsert.useMutation({
    onSuccess: () => {
      toast.success("המאמר נשמר בהצלחה ✓");
      setEditingPost(null);
      refetch();
      void utils.blog.getForEdit.invalidate();
      void utils.blog.list.invalidate();
      void utils.blog.getBySlug.invalidate();
    },
    onError: (e) => toast.error(`שגיאה: ${e.message}`),
  });
  const deleteMutation = trpc.blog.delete.useMutation({
    onSuccess: () => {
      toast.success("המאמר נמחק");
      refetch();
      setEditingPost(null);
      void utils.blog.getForEdit.invalidate();
      void utils.blog.list.invalidate();
      void utils.blog.getBySlug.invalidate();
    },
    onError: (e) => toast.error(`שגיאה: ${e.message}`),
  });

  if (loading) return <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center"><div className="text-[#191265]">טוען...</div></div>;
  if (!user || user.role !== "admin") {
    return <div className="min-h-screen bg-[#f0eadc] flex flex-col gap-3 items-center justify-center" dir="rtl">
      <p className="text-[#191265]">נדרשת הרשאת ניהול לצפייה במאמרים.</p>
      {!user && <Button onClick={() => { window.location.href = getLoginUrl(); }}>כניסה לניהול</Button>}
    </div>;
  }

  const handleSave = (data: Partial<BlogPost>) => {
    upsert.mutate({
      id: data.id,
      title: data.title!,
      slug: data.slug!,
      excerpt: data.excerpt!,
      content: data.content!,
      coverImage: data.coverImage ?? undefined,
      metaDescription: data.metaDescription ?? undefined,
      tags: data.tags ?? undefined,
      isPublished: data.isPublished ?? false,
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`למחוק את "${title}"?`)) return;
    deleteMutation.mutate({ id });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc]" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/crm" className="text-white/70 hover:text-white transition-colors">
            <ArrowRight size={18} />
          </a>
          <h1 className="font-bold text-base">✍️ ניהול מאמרים</h1>
          <span className="text-white/60 text-sm">({posts?.length ?? 0} מאמרים)</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/blog" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="h-8 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20">
              <Eye size={12} className="ml-1" /> צפה בבלוג
            </Button>
          </a>
          <Button
            size="sm"
            onClick={() => setEditingPost("new")}
            className="h-8 text-xs bg-[#ffe27c] text-[#191265] hover:bg-[#ffd84a] font-bold"
          >
            <Plus size={12} className="ml-1" /> מאמר חדש
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* New / Edit form */}
        {editingPost !== null && (
          <Card className="mb-6 border-[#191265]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#191265]">
                {editingPost === "new" ? "מאמר חדש" : `עריכה: ${fullPost?.title ?? "טוען..."}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingPost !== "new" && editError ? (
                <p role="alert" className="text-sm text-red-600">לא ניתן לטעון את המאמר לעריכה: {editError.message}</p>
              ) : editingPost !== "new" && (editLoading || !fullPost || fullPost.id !== editingId) ? (
                <p className="text-sm text-[#727272]">טוען את תוכן המאמר המלא...</p>
              ) : <BlogPostForm
                key={editingPost}
                post={editingPost === "new" ? null : fullPost}
                onSave={handleSave}
                onCancel={() => setEditingPost(null)}
              />}
            </CardContent>
          </Card>
        )}

        {/* Posts list */}
        {postsLoading ? <p className="text-center py-16 text-[#727272]">טוען מאמרים...</p>
        : postsError ? <p role="alert" className="text-center py-16 text-red-600">לא ניתן לטעון את רשימת המאמרים: {postsError.message}</p>
        : !posts || posts.length === 0 ? (
          <div className="text-center py-16 text-[#727272]">
            <div className="text-4xl mb-3">✍️</div>
            <p className="font-medium">אין מאמרים עדיין</p>
            <p className="text-sm mt-1">לחצי על "מאמר חדש" כדי להתחיל</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="border-r-4 border-r-[#191265]/20">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-[#191265] text-sm">{post.title}</span>
                        {post.isPublished ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">מפורסם</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">טיוטה</span>
                        )}
                      </div>
                      {post.excerpt && (
                        <p className="text-xs text-[#727272] leading-relaxed line-clamp-2 mb-2">{post.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[#727272]">
                        <span>/blog/{post.slug}</span>
                        {post.publishedAt && (
                          <>
                            <span>·</span>
                            <span>{format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: he })}</span>
                          </>
                        )}
                        {post.tags && (
                          <>
                            <span>·</span>
                            <span>{normalizeTags(post.tags)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {post.isPublished && <a href={`/blog/${encodeURIComponent(post.slug)}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <Eye size={11} /> צפה
                        </Button>
                      </a>}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                        onClick={() => setEditingPost(post.id)}
                      >
                        <Edit2 size={11} /> ערוך
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDelete(post.id, post.title)}
                      >
                        <Trash2 size={11} /> מחק
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
