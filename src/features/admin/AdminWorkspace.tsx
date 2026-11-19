import React, { useMemo, useState } from 'react';
import { DIRECTORY_ACCOUNTS } from '../../adapters/mock/demoAccounts';
import { WEEKLY_NETWORK_TREND } from '../../adapters/mock/seedAdvisories';
import { AuthUser } from '../../domain/auth/types';
import { applyFareRuleToRoutes } from '../../domain/transit/fareEngine';
import {
  sliceRoutePathForStops,
  snapStopsToRoadPath,
} from '../../domain/transit/tripPlanner';
import {
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  FareRule,
  JeepneyRoute,
  TriageLabel,
  TransitStoreSnapshot,
  VehicleType,
  VerificationTier,
} from '../../domain/transit/types';
import { AdminModuleId } from './adminNavigation';
import { AdminShell } from './AdminShell';
import { AdminSettingsPage, ColorSchemeSetting } from './submodules/AdminSettingsPage';
import { CityCoveragePage } from './submodules/CityCoveragePage';
import { FareMatrixPage } from './submodules/FareMatrixPage';
import { FieldReportsPage } from './submodules/FieldReportsPage';
import { IncidentsAlertsPage } from './submodules/IncidentsAlertsPage';
import { NetworkOverviewPage } from './submodules/NetworkOverviewPage';
import { NotificationsPage } from './submodules/NotificationsPage';
import { SalesAnalyticsPage } from './submodules/SalesAnalyticsPage';
import { RoutesManagerPage } from './submodules/RoutesManagerPage';
import { StopsTerminalsPage } from './submodules/StopsTerminalsPage';
import { UsersDirectoryPage } from './submodules/UsersDirectoryPage';
import { VerificationQueuePage } from './submodules/VerificationQueuePage';
import { useNotifications } from '../../shared/ui/NotificationCenter';

interface AdminWorkspaceProps {
  currentUser: AuthUser;
  cities: CityInfo[];
  snapshot: TransitStoreSnapshot;
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
  onUpdateSnapshot,
  onResetSnapshot,
  schemeSetting,
  onChangeScheme,
  onSignOut,
  initialModule = 'overview',
}) => {
  const [activeModule, setActiveModule] = useState<AdminModuleId>(initialModule);
  const [globalCityFilter, setGlobalCityFilter] = useState<'all' | CityId>('all');
  const [selectedMapRoute, setSelectedMapRoute] = useState<JeepneyRoute | null>(
    snapshot.routes[0] ?? null
  );
  const { notify, unreadCount } = useNotifications();

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
      reports: openReports,
      verification: drafts,
      incidents: activeAlerts,
    };
  }, [snapshot, unreadCount]);

  const handleInspectOnMap = (route: JeepneyRoute) => {
    setSelectedMapRoute(route);
    setGlobalCityFilter(route.cityId);
    setActiveModule('stops');
  };

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
    const fareRule = snapshot.fareRules.find(
      (r) => r.vehicleType === draft.vehicleType
    );

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
      baseFare: fareRule?.baseFarePhp ?? (draft.vehicleType === 'modern_puv' ? 15 : 13),
      perKmRate: fareRule?.perKmRatePhp ?? (draft.vehicleType === 'modern_puv' ? 2.2 : 1.8),
      totalDistanceKm: 5.5,
      estimatedDurationMin: 22,
      headwayMin: '6–9 min',
      operatingHours: '5:00 am – 10:00 pm',
      verificationStatus: 'field_draft',
      verificationNote: 'Created in Admin console; awaiting field stop validation.',
      peakHoursLabel: 'Morning & evening peak',
      peakDemand: [40, 75, 85, 65, 50, 58, 60, 56, 62, 74, 82, 65],
      corridorSummary: `Operator-submitted corridor draft for ${draft.name}.`,
      stops: draftStops,
      path: initialRoadPath,
    };

    onUpdateSnapshot((prev) => ({
      ...prev,
      routes: [newRoute, ...prev.routes],
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

  const handleSaveFareRule = (updatedRule: FareRule) => {
    onUpdateSnapshot((prev) => ({
      ...prev,
      fareRules: prev.fareRules.map((r) =>
        r.id === updatedRule.id ? updatedRule : r
      ),
      routes: applyFareRuleToRoutes(prev.routes, updatedRule),
    }));
    notify({
      title: `Updated ${updatedRule.label} to ₱${updatedRule.baseFarePhp.toFixed(2)}`,
      description: `First ${updatedRule.firstKmCount} km base synced live to Commuter fare tickets.`,
      category: 'system',
      tone: 'success',
      tagLabel: updatedRule.effectiveOrder,
    });
  };

  const handleUpdateTriage = (reportId: string, nextStatus: TriageLabel) => {
    onUpdateSnapshot((prev) => ({
      ...prev,
      reports: prev.reports.map((rep) =>
        rep.id === reportId ? { ...rep, triageStatus: nextStatus } : rep
      ),
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
    }));
    notify({
      title: `Field report ${newReport.id} logged for ${report.routeCode}`,
      description: report.summary,
      category: 'transit_store',
      tone: 'warning',
      tagLabel: `${report.routeCode} · Field Report`,
    });
  };

  const handleToggleAdvisory = (id: string) => {
    const target = snapshot.advisories.find((a) => a.id === id);
    onUpdateSnapshot((prev) => ({
      ...prev,
      advisories: prev.advisories.map((adv) =>
        adv.id === id ? { ...adv, active: !adv.active } : adv
      ),
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
    }));
    notify({
      title: `Corridor advisory ${created.id} published`,
      description: `${created.routeCode}: ${created.title}`,
      category: 'transit_store',
      tone: 'danger',
      tagLabel: created.routeCode,
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
            trendData={WEEKLY_NETWORK_TREND}
            onNavigateModule={setActiveModule}
          />
        );
      case 'analytics':
        return (
          <SalesAnalyticsPage
            cities={cities}
            routes={snapshot.routes}
            globalCityFilter={globalCityFilter}
          />
        );
      case 'notifications':
        return <NotificationsPage />;
      case 'routes':
        return (
          <RoutesManagerPage
            cities={cities}
            routes={snapshot.routes}
            globalCityFilter={globalCityFilter}
            onAddRouteDraft={handleAddRouteDraft}
            onInspectOnMap={handleInspectOnMap}
          />
        );
      case 'stops':
        return (
          <StopsTerminalsPage
            cities={cities}
            routes={snapshot.routes}
            globalCityFilter={globalCityFilter}
            selectedMapRoute={selectedMapRoute}
            onSelectMapRoute={setSelectedMapRoute}
          />
        );
      case 'fares':
        return (
          <FareMatrixPage
            fareRules={snapshot.fareRules}
            onSaveFareRule={handleSaveFareRule}
          />
        );
      case 'cities':
        return (
          <CityCoveragePage
            cities={cities}
            routes={snapshot.routes}
            onScopeCity={(cityId) => {
              setGlobalCityFilter(cityId);
              setActiveModule('stops');
            }}
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
          />
        );
      case 'verification':
        return (
          <VerificationQueuePage
            cities={cities}
            routes={snapshot.routes}
            globalCityFilter={globalCityFilter}
            onPromoteRoute={handlePromoteRoute}
            onInspectOnMap={handleInspectOnMap}
          />
        );
      case 'incidents':
        return (
          <IncidentsAlertsPage
            cities={cities}
            advisories={snapshot.advisories}
            globalCityFilter={globalCityFilter}
            onToggleAdvisory={handleToggleAdvisory}
            onAddAdvisory={handleAddAdvisory}
          />
        );
      case 'users':
        return (
          <UsersDirectoryPage cities={cities} accounts={DIRECTORY_ACCOUNTS} />
        );
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
                  'Routes, LTFRB fare rules, triage statuses, and corridor advisories reset.',
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
    <AdminShell
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      cities={cities}
      globalCityFilter={globalCityFilter}
      onChangeGlobalCity={setGlobalCityFilter}
      currentUser={currentUser}
      onSignOut={onSignOut}
      badges={badges}
    >
      {renderModule()}
    </AdminShell>
  );
};
