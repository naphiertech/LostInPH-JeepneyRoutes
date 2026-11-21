import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bus,
  CheckCircle2,
  ClipboardList,
  Route,
  Settings,
  Users,
} from 'lucide-react';

interface SlideItem {
  id: string;
  headline: string;
  subtitle: string;
  breadcrumb: string;
  activeNav: string;
  statA: { label: string; value: string; delta: string };
  statB: { label: string; value: string; delta: string };
  insights: Array<{ title: string; detail: string }>;
}

const PREVIEW_SLIDES: SlideItem[] = [
  {
    id: 'overview',
    headline: 'Know your exact jeepney in seconds',
    subtitle:
      'Open the live map, pinpoint your destination, and get recommended Philippine jeepney corridors—while admins monitor live users and downloads.',
    breadcrumb: 'Transit Center  ›  Overview',
    activeNav: 'Overview & Live Pulse',
    statA: { label: 'App downloads', value: '14.8k', delta: '+14.2% MoM' },
    statB: { label: 'Online now', value: '342', delta: '5 PH cities live' },
    insights: [
      {
        title: 'Escario Capitol detour (12L)',
        detail: 'Loading shifted 60m north past Escario Central',
      },
      {
        title: 'Cebu City leads live sessions',
        detail: '124 commuters actively pinpointing routes right now',
      },
    ],
  },
  {
    id: 'routes',
    headline: 'Every signboard placard audited',
    subtitle:
      'Inspect alphanumeric codes like 17C and 04L alongside exact Landmark Stops and Terminal turning bays.',
    breadcrumb: 'Transit & alerts  ›  Routes & Stops',
    activeNav: 'Routes & Stops',
    statA: { label: 'Terminals & stops', value: '79', delta: 'Across 5 regions' },
    statB: { label: 'Verified routes', value: '17', delta: 'Street-snapped' },
    insights: [
      {
        title: '17C Apas • IT Park • Carbon',
        detail: '8 landmark stops verified along Gorordo–Colon',
      },
      {
        title: 'BAG-M01 Mines View loop',
        detail: 'Lower Mabini Plaza staging signage synced',
      },
    ],
  },
  {
    id: 'triage',
    headline: 'Commuter reports routed to action',
    subtitle:
      'Real street detours and stop updates submitted by riders flow straight into the operator queue.',
    breadcrumb: 'Transit & alerts  ›  Commuter Reports',
    activeNav: 'Commuter Reports',
    statA: { label: 'Ready for review', value: '2', delta: 'Cebu & Davao' },
    statB: { label: 'Active advisories', value: '3', delta: 'Live alerts synced' },
    insights: [
      {
        title: 'Quimpo Coastal Rd junction bay',
        detail: 'DAV-A03 unloading shed ready for operator sign-off',
      },
      {
        title: 'Carbon Unit II signboard note',
        detail: 'Added Freedom Park cue for first-time commuters',
      },
    ],
  },
];

const PREVIEW_NAV = [
  { label: 'Overview & Live Pulse', icon: Activity },
  { label: 'Users Directory', icon: Users },
  { label: 'Routes & Stops', icon: Route },
  { label: 'Detours & Advisories', icon: AlertTriangle, badge: 'Live' },
  { label: 'Commuter Reports', icon: ClipboardList },
  { label: 'Settings', icon: Settings },
];

export const ShowcasePreviewPanel: React.FC = () => {
  const [slideIdx, setSlideIdx] = useState(0);
  const activeSlide = PREVIEW_SLIDES[slideIdx];

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[24px] bg-[#5F9A1A] pt-10 pl-10 text-white">
      {/* Subtle light diagonal sheen without loud rainbow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10"
      />

      <div className="relative z-10 pr-10">
        <h2 className="font-display max-w-md text-[28px] leading-tight font-semibold tracking-tight text-white">
          {activeSlide.headline}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/88">
          {activeSlide.subtitle}
        </p>

        {/* Carousel Slide Switcher */}
        <div
          className="mt-6 flex items-center gap-2"
          role="tablist"
          aria-label="Platform highlights"
        >
          {PREVIEW_SLIDES.map((slide, idx) => {
            const isCurrent = idx === slideIdx;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={slide.headline}
                onClick={() => setSlideIdx(idx)}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                  isCurrent
                    ? 'w-7 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 3D Tilted Miniature Admin Workspace Preview */}
      <div className="relative mt-8 flex flex-1 items-end justify-end overflow-hidden pt-2">
        <div
          aria-hidden="true"
          style={{
            transform:
              'perspective(1500px) rotateY(-8deg) rotateX(4deg) translateX(14px) translateY(10px)',
            transformOrigin: 'bottom right',
          }}
          className="w-full max-w-[610px] overflow-hidden rounded-tl-[18px] border border-white/45 bg-[#F8F9FA] text-[#111827] shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
        >
          <div className="grid min-h-[370px] grid-cols-[164px_1fr]">
            {/* Mini Neutral Light Sidebar */}
            <aside className="border-r border-[#E5E7EB] bg-[#F4F5F7] p-3">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5D9B19] text-white">
                  <Bus className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-semibold tracking-tight text-[#111827]">
                  LostInPH
                </span>
              </div>

              <div className="mt-3 space-y-0.5">
                {PREVIEW_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = item.label === activeSlide.activeNav;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] ${
                        active
                          ? 'bg-[#E6E8EC] font-medium text-[#111827]'
                          : 'text-[#4B5563]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Icon className="h-3 w-3 shrink-0 text-[#6B7280]" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge && (
                        <span className="rounded bg-[#111827] px-1.5 py-0.5 text-[9px] font-medium text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Mini Main Workspace Sheet */}
            <div className="bg-white p-4">
              <div className="flex items-center justify-between border-b border-[#EEF0F3] pb-2.5 text-[11px] text-[#6B7280]">
                <span className="font-medium text-[#111827]">
                  {activeSlide.breadcrumb}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6E5] px-2 py-0.5 text-[10px] font-medium text-[#4D8015]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5D9B19]" />
                  5 Cities Active
                </span>
              </div>

              {/* Quiet Typographic Mini KPIs */}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[activeSlide.statA, activeSlide.statB].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFB] p-3"
                  >
                    <div className="text-[10px] font-medium text-[#6B7280]">
                      {kpi.label}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="tabular-nums text-lg font-semibold text-[#111827]">
                        {kpi.value}
                      </span>
                      <span className="text-[10px] text-[#5D9B19]">
                        {kpi.delta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clean Single-Hue Corridor Demand Mini Chart */}
              <div className="mt-3 rounded-xl border border-[#E5E7EB] p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-[#111827]">
                    Corridor demand trend
                  </span>
                  <span className="font-mono text-[10px] text-[#6B7280]">
                    Mon–Sun · PHP verified
                  </span>
                </div>
                <svg
                  viewBox="0 0 320 74"
                  className="mt-2 h-16 w-full overflow-visible"
                >
                  <line
                    x1="0"
                    y1="16"
                    x2="320"
                    y2="16"
                    stroke="#EEF0F3"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="40"
                    x2="320"
                    y2="40"
                    stroke="#EEF0F3"
                    strokeWidth="1"
                  />
                  <line
                    x1="0"
                    y1="64"
                    x2="320"
                    y2="64"
                    stroke="#EEF0F3"
                    strokeWidth="1"
                  />
                  <polygon
                    points="0,56 54,44 108,34 162,40 216,18 270,26 320,20 320,64 0,64"
                    fill="#5D9B19"
                    fillOpacity="0.1"
                  />
                  <polyline
                    fill="none"
                    stroke="#5D9B19"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="0,56 54,44 108,34 162,40 216,18 270,26 320,20"
                  />
                  <circle cx="216" cy="18" r="3.5" fill="#5D9B19" />
                </svg>
              </div>

              {/* Operational Insights List */}
              <div className="mt-3 space-y-1.5">
                {activeSlide.insights.map((ins) => (
                  <div
                    key={ins.title}
                    className="flex items-center justify-between rounded-lg border border-[#EEF0F3] px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#5D9B19]" />
                      <div>
                        <div className="text-[11px] font-medium text-[#111827]">
                          {ins.title}
                        </div>
                        <div className="text-[10px] text-[#6B7280]">
                          {ins.detail}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#6B7280]">›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
