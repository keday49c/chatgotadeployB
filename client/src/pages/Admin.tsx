import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<"metrics" | "alerts" | "users">("metrics");

  // Queries
  const { data: metrics, isLoading: metricsLoading } =
    trpc.admin.getMetrics.useQuery();
  const { data: alerts, refetch: refetchAlerts } =
    trpc.admin.getAlerts.useQuery();
  const { data: users, isLoading: usersLoading } =
    trpc.admin.getUsers.useQuery();

  // Mutations
  const markAlertAsReadMutation = trpc.admin.markAlertAsRead.useMutation({
    onSuccess: () => {
      refetchAlerts();
    },
  });

  // Check if user is admin
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You do not have permission to access the admin panel.
          </p>
          <Button onClick={() => setLocation("/chat")}>
            Go to Chat
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your ChatGot platform and view system metrics
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          {["metrics", "alerts", "users"].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === tab
                  ? "text-primary border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Metrics Tab */}
        {selectedTab === "metrics" && (
          <div>
            {metricsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Total Users
                  </div>
                  <div className="text-3xl font-bold">
                    {metrics?.totalUsers || 0}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Total Messages
                  </div>
                  <div className="text-3xl font-bold">
                    {metrics?.totalMessages || 0}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Active Subscriptions
                  </div>
                  <div className="text-3xl font-bold">
                    {metrics?.activeSubscriptions || 0}
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Total Revenue
                  </div>
                  <div className="text-3xl font-bold">
                    R$ {(metrics?.totalRevenue || 0).toFixed(2)}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {selectedTab === "alerts" && (
          <div>
            {!alerts || alerts.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No alerts at this time</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={`p-4 ${
                      alert.isRead ? "opacity-60" : "border-l-4 border-l-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{alert.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {!alert.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            markAlertAsReadMutation.mutate({ alertId: alert.id })
                          }
                          disabled={markAlertAsReadMutation.isPending}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {selectedTab === "users" && (
          <div>
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : !users || users.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No users found</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead className="bg-accent border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-3">{user.name}</td>
                        <td className="px-6 py-3">{user.email}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              user.role === "admin"
                                ? "bg-primary/20 text-primary"
                                : "bg-accent text-foreground"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
