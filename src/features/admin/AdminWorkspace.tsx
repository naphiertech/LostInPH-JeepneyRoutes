import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { WEEKLY_NETWORK_TREND } from '@/adapters/mock/seeds/seedAdvisories';
import { AuthUser } from '@/domain/auth/types';
import { PresencePort } from '@/domain/telemetry/presencePort';
import { auditTransitNetwork } from '@/domain/transit/routeAudit';
import {
  sliceRoutePathForStops,
  snapStopsToRoadPath,
} from '@/domain/transit/tripPlanner';
import {
  AuditCategory,
  AuditLogEntry,
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  JeepneyRoute,
  TriageLabel,
  TransitStoreSnapshot,
  VehicleType,
  VerificationTier,
} from '@/domain/transit/types';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { useNotifications } from '@/shared/ui/NotificationCenter';
import { AdminModuleId } from './adminNavigation';
import { AdminShell } from './AdminShell';
import { AdminCommandPalette } from './components/AdminCommandPalette';
import {
  AdminSettingsPage,
  ColorSchemeSetting,
} from './pages/AdminSettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { FieldReportsPage } from './pages/FieldReportsPage';
import { IncidentsAlertsPage } from './pages/IncidentsAlertsPage';
import { NetworkOverviewPage } from './pages/NetworkOverviewPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RoutesManagerPage } from './pages/RoutesManagerPage';
import { UsersDirectoryPage } from './pages/UsersDirectoryPage';

const RouteQaSimulatorPage = lazy(() =>
  import('./pages/RouteQaSimulatorPage').then((m) => ({
    default: m.RouteQaSimulatorPage,
  }))
);

interface AdminWorkspaceProps {
  currentUser: AuthUser;
  cities: CityInfo[];
  snapshot: TransitStoreSnapshot;
  presencePort: PresencePort;
  onUpdateSnapshot: (
    updater: (prev: TransitStoreSnapshot) => TransitStoreSnapshot
  ) => void;
  onResetSnapshot: () => void;
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onSignOut: () => void;
  initialModule?: AdminModuleId;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  currentUser,
  cities,
  snapshot,
  presencePort,
  onUpdateSnapshot,
  onResetSnapshot,
  schemeSetting,
  onChangeScheme,
  onSignOut,
  initialModule = 'overview',
}) => {
  const adoptionSnapshot = useMemo(
    () => presencePort.getAdoptionSnapshot(),
    [presencePort]
  );
  const directoryAccounts = useMemo(
    () => presencePort.listDirectoryAccounts(),
    [presencePort]
  );
  const [activeModule, setActiveModule] =
    useState<AdminModuleId>(initialModule);
  const [globalCityFilter, setGlobalCityFilter] = useState<'all' | CityId>(
    'all'
  );
  const [selectedMapRoute, setSelectedMapRoute] = useState<JeepneyRoute | null>(
    snapshot.routes[0] ?? null
  );
  const [routesSubView, setRoutesSubView] = useState<'registry' | 'stops'>(
    'registry'
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const { notify, unreadCount } = useNotifications();

  // Global Ctrl+K / Cmd+K Quick Jump shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const scopedRoutes = useMemo(
    () =>
      globalCityFilter === 'all'
        ? snapshot.routes
        : snapshot.routes.filter((r) => r.cityId === globalCityFilter),
    [snapshot.routes, globalCityFilter]
  );

  const scopedReports = useMemo(
    () =>
      globalCityFilter === 'all'
        ? snapshot.reports
        : snapshot.reports.filter((r) => r.cityId === globalCityFilter),
    [snapshot.reports, globalCityFilter]
  );

  const scopedAdvisories = useMemo(
    () =>
      globalCityFilter === 'all'
        ? snapshot.advisories
        : snapshot.advisories.filter((a) => a.cityId === globalCityFilter),
    [snapshot.advisories, globalCityFilter]
  );

  const networkAudit = useMemo(
    () => auditTransitNetwork(snapshot.routes, snapshot.advisories, cities),
    [snapshot.routes, snapshot.advisories, cities]
  );

  const badges = useMemo<Partial<Record<AdminModuleId, number>>>(() => {
    const openReports = snapshot.reports.filter(
      (r) => r.triageStatus !== 'wontfix'
    ).length;
    const drafts = snapshot.routes.filter(
      (r) => r.verificationStatus === 'field_draft'
    ).length;
    const activeAlerts = snapshot.advisories.filter((a) => a.active).length;
    return {
      notifications: unreadCount,
      routes: drafts,
      qa: networkAudit.errorCount + networkAudit.warningCount,
      reports: openReports,
      incidents: activeAlerts,
    };
  }, [snapshot, unreadCount, networkAudit]);

  const buildAuditEntry = useCallback(
    (
      prevCount: number,
      category: AuditCategory,
      action: string,
      target: string,
      details: string,
      cityId?: CityId | 'all'
    ): AuditLogEntry => ({
      id: `AUD-${105 + prevCount}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      actorName: currentUser.name,
      actorRole: 'admin',
      category,
      action,
      target,
      cityId: cityId ?? 'all',
      details,
    }),
    [currentUser.name]
  );

  const handleInspectOnMap = useCallback((route: JeepneyRoute) => {
    setSelectedMapRoute(route);
    setGlobalCityFilter(route.cityId);
    setRoutesSubView('stops');
    setActiveModule('routes');
  }, []);

  const handleInspectRouteCode = useCallback(
    (cityId: CityId, routeCode: string) => {
      const matched = snapshot.routes.find(
        (r) =>
          r.cityId === cityId &&
          r.code.toUpperCase() === routeCode.toUpperCase()
      );
      if (matched) {
        handleInspectOnMap(matched);
      } else {
        setGlobalCityFilter(cityId);
        setRoutesSubView('registry');
        setActiveModule('routes');
      }
    },
    [snapshot.routes, handleInspectOnMap]
  );

  const handleAddRouteDraft = (draft: {
    code: string;
    name: string;
    cityId: CityId;
    vehicleType: VehicleType;
    signboardText: string;
    originName: string;
    destinationName: string;
  }) => {
    const city = cities.find((c) => c.id === draft.cityId) ?? cities[0];
    const [lat, lng] = city.center;

    const cityExistingRoutes = snapshot.routes.filter(
      (r) => r.cityId === draft.cityId
    );
    const referenceRoute = cityExistingRoutes[0];
    const refOriginStop = referenceRoute?.stops[0];
    const refDestStop =
      referenceRoute?.stops[referenceRoute.stops.length - 1];

    const originLat =
      refOriginStop?.lat ?? Number((lat - 0.008).toFixed(5));
    const originLng =
      refOriginStop?.lng ?? Number((lng - 0.008).toFixed(5));
    const destLat = refDestStop?.lat ?? Number((lat + 0.008).toFixed(5));
    const destLng = refDestStop?.lng ?? Number((lng + 0.008).toFixed(5));

    const draftStops = [
      {
        id: `stop-${Date.now()}-1`,
        name: draft.originName,
        lat: originLat,
        lng: originLng,
        landmark: `${draft.originName} loading bay`,
        isTerminal: true,
        barangayOrDistrict: city.name,
      },
      {
        id: `stop-${Date.now()}-2`,
        name: draft.destinationName,
        lat: destLat,
        lng: destLng,
        landmark: `${draft.destinationName} unloading turnaround`,
        isTerminal: true,
        barangayOrDistrict: city.name,
      },
    ];

    const initialRoadPath =
      referenceRoute && refOriginStop && refDestStop
        ? sliceRoutePathForStops(referenceRoute, refOriginStop, refDestStop)
        : [
            [originLat, originLng] as [number, number],
            [lat, lng] as [number, number],
            [destLat, destLng] as [number, number],
          ];

    const routeId = `draft-${draft.cityId}-${draft.code.toLowerCase()}-${Date.now()}`;

    const newRoute: JeepneyRoute = {
      id: routeId,
      code: draft.code,
      name: draft.name,
      cityId: draft.cityId,
      vehicleType: draft.vehicleType,
      signboardText: draft.signboardText,
      color: '#5D9B19',
      baseFare: draft.vehicleType === 'modern_puv' ? 15 : 13,
      perKmRate: draft.vehicleType === 'modern_puv' ? 2.2 : 1.8,
      totalDistanceKm: 5.5,
      estimatedDurationMin: 22,
      headwayMin: '6–9 min',
      operatingHours: '5:00 am – 10:00 pm',
      verificationStatus: 'field_draft',
      verificationNote:
        'Created in Admin console; awaiting field stop validation.',
      peakHoursLabel: 'Morning & evening peak',
      peakDemand: [40, 75, 85, 65, 50, 58, 60, 56, 62, 74, 82, 65],
      corridorSummary: `Operator-submitted corridor draft for ${draft.name}.`,
      stops: draftStops,
      path: initialRoadPath,
    };

    onUpdateSnapshot((prev) => ({
      ...prev,
      routes: [newRoute, ...prev.routes],
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'route',
          'Created route draft',
          draft.code,
          `${draft.name} (${draft.signboardText})`,
          draft.cityId
        ),
        ...prev.auditLogs,
      ],
    }));

    notify({
      title: `Route draft ${draft.code} created`,
      description: `${draft.name} queued in ${city.name} for field verification.`,
      category: 'transit_store',
      tone: 'success',
      tagLabel: `${draft.code} · Draft`,
    });

    void snapStopsToRoadPath(draftStops).then((snappedPath) => {
      if (!snappedPath || snappedPath.length < 2) return;
      onUpdateSnapshot((prev) => ({
        ...prev,
        routes: prev.routes.map((r) =>
          r.id === routeId ? { ...r, path: snappedPath } : r
        ),
      }));
    });
  };

  const handleUpdateRoute = (updated: JeepneyRoute) => {
    onUpdateSnapshot((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => (r.id === updated.id ? updated : r)),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'route',
          'Updated route corridor',
          updated.code,
          `${updated.name} · ${updated.stops.length} stops · ${updated.signboardText}`,
          updated.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Route ${updated.code} updated`,
      description: `${updated.name} (${updated.stops.length} stops)`,
      category: 'transit_store',
      tone: 'success',
      tagLabel: updated.code,
    });
  };

  const handleDeleteRoute = (routeId: string) => {
    const target = snapshot.routes.find((r) => r.id === routeId);
    onUpdateSnapshot((prev) => ({
      ...prev,
      routes: prev.routes.filter((r) => r.id !== routeId),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'route',
          'Deleted route corridor',
          target?.code ?? routeId,
          target ? `Removed ${target.name}` : 'Removed route from registry',
          target?.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    if (selectedMapRoute?.id === routeId) {
      setSelectedMapRoute(null);
    }
    notify({
      title: `Removed corridor ${target?.code ?? routeId}`,
      category: 'transit_store',
      tone: 'warning',
      tagLabel: target?.code ?? 'Deleted',
    });
  };

  const handleBulkImportRoutes = (imported: JeepneyRoute[]) => {
    onUpdateSnapshot((prev) => ({
      ...prev,
      routes: [...imported, ...prev.routes],
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'route',
          `Bulk imported ${imported.length} route(s)`,
          imported.map((r) => r.code).join(', '),
          `Validated JSON import across ${new Set(imported.map((r) => r.cityId)).size} city(ies).`,
          imported.length === 1 ? imported[0].cityId : 'all'
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Imported ${imported.length} jeepney route(s)`,
      description: imported.map((r) => r.code).join(', '),
      category: 'transit_store',
      tone: 'success',
      tagLabel: 'Bulk Import',
    });
  };

  const handlePromoteRoute = (routeId: string, nextTier: VerificationTier) => {
    const targetRoute = snapshot.routes.find((r) => r.id === routeId);
    onUpdateSnapshot((prev) => ({
      ...prev,
      routes: prev.routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              verificationStatus: nextTier,
              verificationNote:
                nextTier === 'ltfrb_reference'
                  ? 'Anchored to LTFRB corridor reference by Admin.'
                  : 'Promoted to community_verified by Admin audit.',
            }
          : r
      ),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'route',
          'Verified route corridor',
          targetRoute?.code ?? routeId,
          `Promoted to ${nextTier}.`,
          targetRoute?.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Corridor ${targetRoute?.code ?? ''} promoted to ${
        nextTier === 'ltfrb_reference' ? 'LTFRB reference' : 'Community verified'
      }`,
      category: 'transit_store',
      tone: 'success',
      tagLabel: targetRoute?.code ?? nextTier,
    });
  };

  const handleAutoSnapRoute = (routeId: string) => {
    const target = snapshot.routes.find((r) => r.id === routeId);
    if (!target || target.stops.length < 2) return;
    notify({
      title: `Snapping ${target.code} to road network…`,
      category: 'system',
      tone: 'info',
      tagLabel: target.code,
    });
    void snapStopsToRoadPath(target.stops).then((snapped) => {
      if (!snapped || snapped.length < 2) return;
      onUpdateSnapshot((prev) => ({
        ...prev,
        routes: prev.routes.map((r) =>
          r.id === routeId ? { ...r, path: snapped } : r
        ),
        auditLogs: [
          buildAuditEntry(
            prev.auditLogs.length,
            'route',
            'Auto-snapped road geometry',
            target.code,
            `Generated ${snapped.length} road-following vertices.`,
            target.cityId
          ),
          ...prev.auditLogs,
        ],
      }));
    });
  };

  const handleUpdateTriage = (reportId: string, nextStatus: TriageLabel) => {
    const target = snapshot.reports.find((r) => r.id === reportId);
    onUpdateSnapshot((prev) => ({
      ...prev,
      reports: prev.reports.map((rep) =>
        rep.id === reportId ? { ...rep, triageStatus: nextStatus } : rep
      ),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'report',
          `Triaged report -> ${nextStatus}`,
          reportId,
          target ? `${target.routeCode}: ${target.summary}` : nextStatus,
          target?.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Report ${reportId} moved to ${nextStatus}`,
      category: 'transit_store',
      tone: 'info',
      tagLabel: reportId,
    });
  };

  const handleAddReport = (
    report: Omit<CommunityReport, 'id' | 'createdAt'>
  ) => {
    const newReport: CommunityReport = {
      ...report,
      id: `REP-${210 + snapshot.reports.length}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onUpdateSnapshot((prev) => ({
      ...prev,
      reports: [newReport, ...prev.reports],
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'report',
          'Logged field report',
          newReport.id,
          `${report.routeCode}: ${report.summary}`,
          report.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Field report ${newReport.id} logged for ${report.routeCode}`,
      description: report.summary,
      category: 'transit_store',
      tone: 'warning',
      tagLabel: `${report.routeCode} · Field Report`,
    });
  };

  const handleConvertReportToAdvisory = (report: CommunityReport) => {
    const created: CorridorAdvisory = {
      id: `ADV-${410 + snapshot.advisories.length}`,
      cityId: report.cityId,
      routeCode: report.routeCode,
      title: report.summary,
      description: `${report.details} (Converted from commuter report ${report.id} by ${report.reporterName}).`,
      severity: report.issueType === 'route_detour' ? 'detour' : 'advisory',
      active: true,
      reportedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onUpdateSnapshot((prev) => ({
      ...prev,
      advisories: [created, ...prev.advisories],
      reports: prev.reports.map((r) =>
        r.id === report.id ? { ...r, triageStatus: 'ready-for-human' } : r
      ),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'advisory',
          'Converted report to live advisory',
          `${report.id} → ${created.id}`,
          `${report.routeCode}: ${report.summary}`,
          report.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Published ${created.id} directly from ${report.id}`,
      description: `${created.routeCode}: ${created.title}`,
      category: 'transit_store',
      tone: 'success',
      tagLabel: `${created.routeCode} · Live`,
    });
  };

  const handleToggleAdvisory = (id: string) => {
    const target = snapshot.advisories.find((a) => a.id === id);
    onUpdateSnapshot((prev) => ({
      ...prev,
      advisories: prev.advisories.map((adv) =>
        adv.id === id ? { ...adv, active: !adv.active } : adv
      ),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'advisory',
          target?.active ? 'Resolved advisory' : 'Re-activated advisory',
          target?.id ?? id,
          target ? `${target.routeCode}: ${target.title}` : id,
          target?.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    if (target) {
      notify({
        title: `Advisory ${target.id} (${target.routeCode}) ${
          target.active ? 'resolved' : 're-activated'
        }`,
        category: 'transit_store',
        tone: target.active ? 'success' : 'warning',
        tagLabel: target.routeCode,
      });
    }
  };

  const handleAddAdvisory = (
    advisory: Omit<CorridorAdvisory, 'id' | 'reportedAt'>
  ) => {
    const created: CorridorAdvisory = {
      ...advisory,
      id: `ADV-${410 + snapshot.advisories.length}`,
      reportedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    onUpdateSnapshot((prev) => ({
      ...prev,
      advisories: [created, ...prev.advisories],
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'advisory',
          'Published corridor advisory',
          created.id,
          `${created.routeCode}: ${created.title}`,
          created.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Corridor advisory ${created.id} published`,
      description: `${created.routeCode}: ${created.title}`,
      category: 'transit_store',
      tone: 'danger',
      tagLabel: created.routeCode,
    });
  };

  const handleDeleteAdvisory = (id: string) => {
    const target = snapshot.advisories.find((a) => a.id === id);
    onUpdateSnapshot((prev) => ({
      ...prev,
      advisories: prev.advisories.filter((a) => a.id !== id),
      auditLogs: [
        buildAuditEntry(
          prev.auditLogs.length,
          'advisory',
          'Deleted resolved advisory',
          id,
          target ? `${target.routeCode}: ${target.title}` : id,
          target?.cityId
        ),
        ...prev.auditLogs,
      ],
    }));
    notify({
      title: `Removed advisory ${id}`,
      category: 'transit_store',
      tone: 'info',
      tagLabel: target?.routeCode ?? id,
    });
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'overview':
        return (
          <NetworkOverviewPage
            cities={cities}
            routes={scopedRoutes}
            reports={scopedReports}
            advisories={scopedAdvisories}
            accounts={directoryAccounts}
            adoption={adoptionSnapshot}
            globalCityFilter={globalCityFilter}
            trendData={WEEKLY_NETWORK_TREND}
            onNavigateModule={setActiveModule}
          />
        );
      case 'users':
        return (
          <UsersDirectoryPage
            cities={cities}
            accounts={directoryAccounts}
            adoption={adoptionSnapshot}
          />
        );
      case 'routes':
        return (
          <RoutesManagerPage
            cities={cities}
            routes={snapshot.routes}
            globalCityFilter={globalCityFilter}
            activeSubView={routesSubView}
            onChangeSubView={setRoutesSubView}
            selectedMapRoute={selectedMapRoute}
            onSelectMapRoute={setSelectedMapRoute}
            onAddRouteDraft={handleAddRouteDraft}
            onUpdateRoute={handleUpdateRoute}
            onDeleteRoute={handleDeleteRoute}
            onBulkImportRoutes={handleBulkImportRoutes}
            onPromoteRoute={handlePromoteRoute}
            onInspectOnMap={handleInspectOnMap}
          />
        );
      case 'qa':
        return (
          <ErrorBoundary scopeLabel="Route QA & Simulator">
            <Suspense
              fallback={
                <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--text-muted)]">
                  Loading Route QA &amp; Simulator…
                </div>
              }
            >
              <RouteQaSimulatorPage
                cities={cities}
                routes={snapshot.routes}
                advisories={snapshot.advisories}
                globalCityFilter={globalCityFilter}
                onInspectRoute={handleInspectOnMap}
                onAutoSnapRoute={handleAutoSnapRoute}
                onResolveAdvisory={handleToggleAdvisory}
              />
            </Suspense>
          </ErrorBoundary>
        );
      case 'incidents':
        return (
          <IncidentsAlertsPage
            cities={cities}
            advisories={snapshot.advisories}
            globalCityFilter={globalCityFilter}
            onToggleAdvisory={handleToggleAdvisory}
            onAddAdvisory={handleAddAdvisory}
            onDeleteAdvisory={handleDeleteAdvisory}
          />
        );
      case 'reports':
        return (
          <FieldReportsPage
            cities={cities}
            reports={snapshot.reports}
            globalCityFilter={globalCityFilter}
            onUpdateReportTriage={handleUpdateTriage}
            onAddReport={handleAddReport}
            onConvertToAdvisory={handleConvertReportToAdvisory}
            onInspectRouteCode={handleInspectRouteCode}
          />
        );
      case 'audit':
        return (
          <AuditLogPage
            cities={cities}
            auditLogs={snapshot.auditLogs}
            globalCityFilter={globalCityFilter}
          />
        );
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return (
          <AdminSettingsPage
            currentUser={currentUser}
            schemeSetting={schemeSetting}
            onChangeScheme={(scheme) => {
              onChangeScheme(scheme);
              notify({
                title: `Appearance switched to ${scheme} mode`,
                category: 'system',
                tone: 'info',
                tagLabel: 'Workspace Theme',
              });
            }}
            onResetDemoData={() => {
              onResetSnapshot();
              notify({
                title: 'Seed transit dataset restored to defaults.',
                description:
                  'Routes, stops, triage statuses, advisories, and audit logs reset.',
                category: 'system',
                tone: 'success',
                tagLabel: 'Dataset Reset',
              });
            }}
            onSignOut={onSignOut}
          />
        );
    }
  };

  return (
    <>
      <AdminShell
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        cities={cities}
        globalCityFilter={globalCityFilter}
        onChangeGlobalCity={setGlobalCityFilter}
        currentUser={currentUser}
        onSignOut={onSignOut}
        onOpenQuickJump={() => setCommandOpen(true)}
        badges={badges}
      >
        {renderModule()}
      </AdminShell>

      <AdminCommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        cities={cities}
        routes={snapshot.routes}
        advisories={snapshot.advisories}
        onSelectModule={setActiveModule}
        onSelectCity={setGlobalCityFilter}
        onInspectRoute={handleInspectOnMap}
      />
    </>
  );
};
