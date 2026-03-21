import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Building2, MapPin, Users, ClipboardList, FileText, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RecentTasksList from '@/components/dashboard/RecentTasksList';
import TaskSemaphore from '@/components/dashboard/TaskSemaphore';

export default function CommunityDetail() {
  const { user } = useOutletContext();
  const communityId = new URLSearchParams(window.location.search).get('id') ||
    window.location.pathname.split('/communities/')[1];

  const { data: community, isLoading } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const list = await base44.entities.Community.filter({ id: communityId });
      return list[0];
    },
    enabled: !!communityId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['community-tasks', communityId],
    queryFn: () => base44.entities.Task.filter({ community_id: communityId }, '-created_date'),
    enabled: !!communityId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: () => base44.entities.CommunityMember.filter({ community_id: communityId, status: 'active' }),
    enabled: !!communityId,
  });

  const { data: procedures = [] } = useQuery({
    queryKey: ['community-procedures', communityId],
    queryFn: () => base44.entities.Procedure.filter({ community_id: communityId }),
    enabled: !!communityId,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>;
  }

  if (!community) {
    return <div className="text-center py-20">
      <p className="text-muted-foreground">Comunidad no encontrada</p>
      <Link to="/communities"><Button variant="outline" className="mt-4">Volver</Button></Link>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/communities">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{community.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>{community.address}, {community.comuna}, {community.region}</span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tipo</p>
          <p className="font-semibold capitalize mt-1">{community.type}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Unidades</p>
          <p className="font-semibold mt-1">{community.units}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Miembros</p>
          <p className="font-semibold mt-1">{members.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Tareas</p>
          <p className="font-semibold mt-1">{tasks.length}</p>
        </Card>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="members">Miembros</TabsTrigger>
          <TabsTrigger value="procedures">Procedimientos</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <TaskSemaphore tasks={tasks} />
          <RecentTasksList tasks={tasks} title="Tareas de la Comunidad" />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay miembros asignados</p>
              ) : (
                <div className="space-y-3">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{m.user_name || m.user_email}</p>
                        <p className="text-xs text-muted-foreground">{m.user_email}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {procedures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay procedimientos</p>
              ) : (
                <div className="space-y-3">
                  {procedures.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.classification}</p>
                      </div>
                      <Badge variant="secondary">
                        {p.procedure_type === 'documento' ? 'Documento' : 'Flujo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">RUT</p><p className="font-medium">{community.rut}</p></div>
                <div><p className="text-sm text-muted-foreground">Email Comité</p><p className="font-medium">{community.contact_email}</p></div>
                {community.description && <div className="col-span-2"><p className="text-sm text-muted-foreground">Descripción</p><p className="font-medium">{community.description}</p></div>}
                {community.year_built && <div><p className="text-sm text-muted-foreground">Año Construcción</p><p className="font-medium">{community.year_built}</p></div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}