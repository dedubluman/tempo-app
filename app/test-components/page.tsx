"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";

export default function TestComponentsPage() {
  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold" data-testid="test-page-heading">Component Test Page</h1>

      <section data-testid="buttons-section">
        <div className="flex gap-3 flex-wrap">
          <Button data-testid="btn-primary">Primary</Button>
          <Button variant="secondary" data-testid="btn-secondary">Secondary</Button>
          <Button variant="ghost" data-testid="btn-ghost">Ghost</Button>
          <Button variant="danger" data-testid="btn-danger">Danger</Button>
          <Button loading data-testid="btn-loading">Loading</Button>
        </div>
      </section>

      <section data-testid="badges-section">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="success" dot data-testid="badge-success">Confirmed</Badge>
          <Badge variant="error" dot data-testid="badge-error">Failed</Badge>
          <Badge variant="warning" dot pulse data-testid="badge-pending">Pending</Badge>
          <Badge variant="info" data-testid="badge-info">Info</Badge>
          <Badge variant="neutral" data-testid="badge-neutral">Neutral</Badge>
          <Badge variant="brand" data-testid="badge-brand">Gas: $0 (sponsored)</Badge>
        </div>
      </section>

      <section data-testid="cards-section">
        <div className="space-y-3">
          <Card variant="flat" data-testid="card-flat">
            <CardHeader><CardTitle>Flat Card</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-[--text-secondary]">Content here</p></CardContent>
          </Card>
          <Card variant="elevated" data-testid="card-elevated">
            <CardContent><p className="text-sm">Elevated card</p></CardContent>
          </Card>
        </div>
      </section>

      <section data-testid="skeletons-section">
        <div className="space-y-2">
          <Skeleton variant="text" data-testid="skeleton-text" />
          <Skeleton variant="card" data-testid="skeleton-card" />
          <Skeleton variant="circle" data-testid="skeleton-circle" />
        </div>
      </section>

      <section data-testid="empty-state-section">
        <EmptyState
          icon={History}
          title="No transactions yet"
          description="Your activity will appear here."
          data-testid="empty-state"
        />
      </section>
    </div>
  );
}
