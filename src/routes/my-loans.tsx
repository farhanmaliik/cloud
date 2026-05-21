import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/my-loans")({
  component: MyLoans,
});

type Loan = {
  id: string;
  borrowed_at: string;
  due_at: string;
  returned_at: string | null;
  books: { id: string; title: string; author: string; cover_url: string | null } | null;
};

function MyLoans() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("loans")
      .select("id,borrowed_at,due_at,returned_at, books(id,title,author,cover_url)")
      .order("borrowed_at", { ascending: false });
    setLoans((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const returnBook = async (id: string) => {
    const { error } = await supabase.rpc("return_book", { _loan_id: id });
    if (error) return toast.error(error.message);
    toast.success("Returned. Thanks!");
    load();
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">My Loans</h1>
      <p className="text-muted-foreground mt-1">Books you've borrowed and your history.</p>

      <div className="mt-8 space-y-3">
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : loans.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">You haven't borrowed anything yet.</p>
            <Button asChild className="mt-4"><Link to="/">Browse books</Link></Button>
          </div>
        ) : (
          loans.map((l) => (
            <Card key={l.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-secondary">
                  {l.books?.cover_url ? (
                    <img src={l.books.cover_url} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-5 w-5 text-primary/40" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/books/$bookId" params={{ bookId: l.books?.id ?? "" }} className="font-medium hover:underline">
                    {l.books?.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{l.books?.author}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Borrowed {new Date(l.borrowed_at).toLocaleDateString()} · Due {new Date(l.due_at).toLocaleDateString()}
                  </p>
                </div>
                {l.returned_at ? (
                  <Badge variant="secondary">Returned</Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => returnBook(l.id)}>Return</Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}