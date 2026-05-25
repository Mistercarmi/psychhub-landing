import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({
  title,
  description,
  todos
}: {
  title: string;
  description: string;
  todos: string[];
}) {
  return (
    <>
      <Topbar title={title} />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <Badge variant="secondary">À venir</Badge>
            </div>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm font-medium">Prochaines fonctionnalités :</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {todos.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
