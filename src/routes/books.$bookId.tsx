import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/books/$bookId")({
  component: BookDetail,
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
  available_copies: number;
  total_copies: number;
  categories: { name: string } | null;
};

function BookDetail() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState({
    full_name: "",
    student_id: "",
    department: "",
    semester: "",
    contact: "",
    university_email: "",
  });

  const load = async () => {
    const { data } = await supabase
      .from("books")
      .select("*, categories(name)")
      .eq("id", bookId)
      .maybeSingle();
    setBook(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [bookId]);

  const openBorrow = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    setDetails((d) => ({
      ...d,
      full_name: d.full_name || profile?.full_name || "",
      university_email: d.university_email || user.email || "",
    }));
    setOpen(true);
  };

  const confirmBorrow = async () => {
    const required = ["full_name", "student_id", "department", "semester", "contact", "university_email"] as const;
    for (const k of required) {
      if (!details[k].trim()) return toast.error("Please fill in all fields");
    }
    setBusy(true);
    const { error } = await supabase.rpc("borrow_book", {
      _book_id: bookId,
      _full_name: details.full_name,
      _student_id: details.student_id,
      _department: details.department,
      _semester: details.semester,
      _contact: details.contact,
      _university_email: details.university_email,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Book borrowed! Check My Loans.");
    setOpen(false);
    load();
  };

  const download = async () => {
    if (!book?.file_path) return;
    const { data, error } = await supabase.storage.from("book-files").download(book.file_path);
    if (error || !data) return toast.error("Could not open file");
    const blobUrl = URL.createObjectURL(data);
    window.open(blobUrl, "_blank");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  if (loading) return <div className="container mx-auto px-4 py-10">Loading…</div>;
  if (!book) return <div className="container mx-auto px-4 py-10">Book not found.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Back to library</Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="aspect-[2/3] overflow-hidden rounded-lg bg-secondary shadow-lg">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20">
              <BookOpen className="h-20 w-20 text-primary/40" />
            </div>
          )}
        </div>

        <div>
          {book.categories?.name && (
            <Badge variant="secondary" className="mb-3">{book.categories.name}</Badge>
          )}
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">{book.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">by {book.author}</p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {book.published_year && <span>Published {book.published_year}</span>}
            {book.isbn && <span>ISBN {book.isbn}</span>}
            <span>{book.available_copies} of {book.total_copies} available</span>
          </div>

          {book.description && (
            <p className="mt-6 leading-relaxed text-foreground/90 whitespace-pre-line">{book.description}</p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={openBorrow} disabled={busy || book.available_copies === 0} size="lg">
              {book.available_copies === 0 ? "Unavailable" : busy ? "Borrowing…" : "Borrow"}
            </Button>
            {book.file_path && user && (
              <Button variant="outline" size="lg" onClick={download}>
                <Download className="h-4 w-4 mr-2" /> Open file
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Borrow "{book.title}"</DialogTitle>
            <DialogDescription>Please provide your details. These will be shared with the library admin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={details.full_name} onChange={(e) => setDetails({ ...details, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="student_id">Student ID</Label>
                <Input id="student_id" value={details.student_id} onChange={(e) => setDetails({ ...details, student_id: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="semester">Semester</Label>
                <Input id="semester" value={details.semester} onChange={(e) => setDetails({ ...details, semester: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={details.department} onChange={(e) => setDetails({ ...details, department: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contact">Contact number</Label>
              <Input id="contact" type="tel" value={details.contact} onChange={(e) => setDetails({ ...details, contact: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="university_email">University email</Label>
              <Input id="university_email" type="email" value={details.university_email} onChange={(e) => setDetails({ ...details, university_email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={confirmBorrow} disabled={busy}>{busy ? "Borrowing…" : "Confirm borrow"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}