import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Browse,
});

type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  available_copies: number;
  category_id: string | null;
};
type Category = { id: string; name: string; slug: string };

function Browse() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: b }] = await Promise.all([
        supabase.from("categories").select("id,name,slug").order("name"),
        supabase.from("books").select("id,title,author,cover_url,available_copies,category_id").order("created_at", { ascending: false }),
      ]);
      setCategories(c ?? []);
      setBooks(b ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = books.filter((b) => {
    if (cat && b.category_id !== cat) return false;
    if (q && !`${b.title} ${b.author}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <section className="border-b bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl">
            A modern academic library, open at all hours.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
            Browse thousands of titles, borrow with a click, and read instantly.
          </p>
          <div className="mt-8 flex max-w-xl items-center gap-2 rounded-lg bg-background p-2 shadow-lg">
            <Search className="ml-2 h-5 w-5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or author…"
              className="border-0 text-foreground focus-visible:ring-0 shadow-none"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2">
          <Button variant={cat === null ? "default" : "outline"} size="sm" onClick={() => setCat(null)}>
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              variant={cat === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setCat(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        {loading ? (
          <p className="text-muted-foreground">Loading books…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">No books match your search yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((b) => (
              <Link key={b.id} to="/books/$bookId" params={{ bookId: b.id }}>
                <Card className="overflow-hidden h-full transition hover:shadow-lg hover:-translate-y-0.5 group p-0">
                  <div className="aspect-[2/3] bg-secondary overflow-hidden">
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        className="h-full w-full transition group-hover:scale-105 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/20">
                        <BookOpen className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium line-clamp-2 leading-tight">{b.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{b.author}</p>
                    <Badge variant={b.available_copies > 0 ? "secondary" : "outline"} className="mt-2">
                      {b.available_copies > 0 ? `${b.available_copies} available` : "Unavailable"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
