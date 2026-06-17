import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { RequireAuth } from '@/lib/auth/RequireAuth';
import { AppHeader } from '@/components/AppHeader';
import { ContainerSidebar } from '@/components/containers/ContainerSidebar';
import { SectionGrid } from '@/components/sections/SectionGrid';
import { useCollection } from '@/lib/data/useCollections';
import { useContainers, useUpdateContainer } from '@/lib/data/useContainers';
import { InlineEditableTitle } from '@/components/ui/InlineEditableTitle';

export function ContainerPageRoute() {
  return (
    <RequireAuth>
      <ContainerPage />
    </RequireAuth>
  );
}

function ContainerPage() {
  const params = useParams({ strict: false });
  const collectionId = params.collectionId as string;
  const containerId = (params.containerId as string | undefined) ?? null;

  const navigate = useNavigate();
  const { data: collection } = useCollection(collectionId);
  const { data: containers, isPending } = useContainers(collectionId);
  const updateContainer = useUpdateContainer();

  // No container selected → jump to the first one once containers are known.
  useEffect(() => {
    if (!containerId && containers && containers.length > 0) {
      navigate({
        to: '/app/collections/$collectionId/containers/$containerId',
        params: { collectionId, containerId: containers[0].id },
        replace: true
      });
    }
  }, [containerId, containers, collectionId, navigate]);

  const selected = containers?.find((c) => c.id === containerId) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-600">{collection?.name ?? '…'}</span>
      </AppHeader>

      <div className="flex flex-1">
        <ContainerSidebar
          collectionId={collectionId}
          containers={containers ?? []}
          selectedContainerId={containerId}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isPending ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !containers || containers.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-400">
              No notes in this collection yet — create one from the sidebar.
            </div>
          ) : selected ? (
            <>
              <InlineEditableTitle
                value={selected.title}
                onSave={(title) =>
                  updateContainer.mutate({ id: selected.id, collectionId, updates: { title } })
                }
                className="mb-4 block text-xl font-semibold"
                inputClassName="mb-4 w-full max-w-lg rounded border border-blue-300 px-1 text-xl font-semibold focus:outline-none"
              />
              <SectionGrid collectionId={collectionId} containerId={selected.id} />
            </>
          ) : (
            <p className="text-sm text-slate-400">Select a note…</p>
          )}
        </main>
      </div>
    </div>
  );
}
