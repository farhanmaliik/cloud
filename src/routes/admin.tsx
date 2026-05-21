import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

type Book = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  isbn: string | null;
  published_year: number | null;
  cover_url: string | null;
  file_path: string | null;
  category_id: string | null;
  total_copies: number;
  available_copies: number;
};
type Category = { id: string; name: string };
type LoanRow = {
  id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  full_name: string | null;
  student_id: string | null;
  department: string | null;
  semester: string | null;
  contact: string | null;
  university_email: string | null;
  books: { title: string; author: string } | null;
};

const empty: Partial<Book> = {
  title: "", author: "", description: "", isbn: "", published_year: undefined,
  cover_url: "", category_id: undefined, total_copies: 1, available_copies: 1,
};

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Book>>(empty);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  const load = async () => {
    const [{ data: b }, { data: c }, { data: l }] = await Promise.all([
      supabase.from("books").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
      supabase
        .from("loans")
        .select("id,borrowed_at,due_at,returned_at,full_name,student_id,department,semester,contact,university_email,books(title,author)")
        .order("borrowed_at", { ascending: false }),
    ]);
    setBooks(b ?? []);
    setCats(c ?? []);
    setLoans((l ?? []) as any);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const startNew = () => { setForm(empty); setCoverFile(null); setBookFile(null); setOpen(true); };
  const startEdit = (b: Book) => { setForm(b); setCoverFile(null); setBookFile(null); setOpen(true); };

  const save = async () => {
    if (!form.title || !form.author) return toast.error("Title and author are required");
    setSaving(true);
    try {
      let cover_url = form.cover_url ?? null;
      let file_path = form.file_path ?? null;

      if (coverFile) {
        const path = `${Date.now()}-${coverFile.name}`;
        const { error } = await supabase.storage.from("book-covers").upload(path, coverFile, { upsert: true });
        if (error) throw error;
        cover_url = supabase.storage.from("book-covers").getPublicUrl(path).data.publicUrl;
      }
      if (bookFile) {
        const path = `${Date.now()}-${bookFile.name}`;
        const { error } = await supabase.storage.from("book-files").upload(path, bookFile, { upsert: true });
        if (error) throw error;
        file_path = path;
      }

      const payload = {
        title: form.title!, author: form.author!,
        description: form.description ?? null, isbn: form.isbn ?? null,
        published_year: form.published_year ? Number(form.published_year) : null,
        category_id: form.category_id ?? null,
        total_copies: Number(form.total_copies ?? 1),
        available_copies: Number(form.available_copies ?? form.total_copies ?? 1),
        cover_url, file_path,
      };

      if (form.id) {
        const { error } = await supabase.from("books").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Book updated");
      } else {
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw error;
        toast.success("Book added");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const addCategory = async () => {
    const name = window.prompt("New category name")?.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, slug })
      .select("id,name")
      .single();
    if (error) return toast.error(error.message);
    setCats((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, category_id: data.id }));
    toast.success("Category added");
  };

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Admin · Books</h1>
          <p className="text-muted-foreground mt-1">Manage your library catalog.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}><Plus className="h-4 w-4 mr-2" /> Add book</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit book" : "Add book"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Title *</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Author *</Label><Input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>ISBN</Label><Input value={form.isbn ?? ""} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
                <div><Label>Year</Label><Input type="number" value={form.published_year ?? ""} onChange={(e) => setForm({ ...form, published_year: e.target.value as any })} /></div>
                <div>
                  <Label>Category</Label>
                  <div className="flex gap-2">
                    <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" title="Add new category" onClick={addCategory}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total copies</Label><Input type="number" min={0} value={form.total_copies ?? 1} onChange={(e) => setForm({ ...form, total_copies: Number(e.target.value) })} /></div>
                <div><Label>Available copies</Label><Input type="number" min={0} value={form.available_copies ?? 1} onChange={(e) => setForm({ ...form, available_copies: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Cover image {form.cover_url && "(current set)"}</Label>
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
              </div>
              <div>
                <Label>Book file (PDF/ePub) {form.file_path && "(current set)"}</Label>
                <Input type="file" accept=".pdf,.epub,application/pdf" onChange={(e) => setBookFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle>Catalog ({books.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>{b.author}</TableCell>
                  <TableCell>{b.available_copies} / {b.total_copies}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {books.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No books yet. Add your first one.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader><CardTitle>Borrow requests ({loans.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>University email</TableHead>
                <TableHead>Borrowed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.books?.title ?? "—"}</TableCell>
                  <TableCell>{l.full_name ?? "—"}</TableCell>
                  <TableCell>{l.student_id ?? "—"}</TableCell>
                  <TableCell>{l.department ?? "—"}</TableCell>
                  <TableCell>{l.semester ?? "—"}</TableCell>
                  <TableCell>{l.contact ?? "—"}</TableCell>
                  <TableCell>{l.university_email ?? "—"}</TableCell>
                  <TableCell>{new Date(l.borrowed_at).toLocaleDateString()}</TableCell>
                  <TableCell>{l.returned_at ? "Returned" : "Active"}</TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No borrow requests yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}