import { useState } from 'react';
import Header from '../components/Header';

const plans = [
  {
    id: 'field',
    name: 'Field',
    price: '$24',
    description: 'For independent studies',
    features: ['✓ 60 renders / month', '✓ Standard scene analysis', '✓ 10 GB workspace'],
    cta: 'Choose plan ↗',
    current: false,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$68',
    description: 'For working architecture teams',
    features: ['✓ 300 renders / month', '✓ Priority scene analysis', '✓ 100 GB workspace'],
    cta: 'Selected plan ↗',
    current: true,
  },
  {
    id: 'practice',
    name: 'Practice',
    price: '$180',
    description: 'For a shared visualization desk',
    features: ['✓ Unlimited draft renders', '✓ Team review links', '✓ 1 TB workspace'],
    cta: 'Choose plan ↗',
    current: false,
  },
];

export default function Subscription({ onNavigate }) {
  const [selectedPlan, setSelectedPlan] = useState('studio');

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <div className="bg-surface border border-line md:rounded-[6px] overflow-clip mx-auto w-full max-w-[1392px] flex flex-col min-h-screen">
        <Header onNavigate={onNavigate} currentPage="subscription" variant="account" />

        <main className="flex flex-col gap-5 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">

          {/* Page heading */}
          <div className="flex flex-col gap-1 max-w-[576px]">
            <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px] leading-[16px]">Account / plan</p>
            <h1 className="text-ink font-bold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[32px] mt-1">Room to make the next pass.</h1>
            <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">
              Your plan keeps the visual thinking moving — from a rough massing study to the render you show the room.
            </p>
          </div>

          {/* Plan summary + usage: stacks on mobile, 2-col on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 sm:gap-6">
            <section className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
              <div>
                <p className="text-muted text-[10px] sm:text-[11px]">💳 Current plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-ink font-bold text-[19px] sm:text-[20px] leading-[28px]">Studio</h2>
                  <span className="border border-line text-ink-4 text-[10px] px-2 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-muted text-[12px] sm:text-[13px]">For Mara Chen · renews July 24, 2025</p>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-muted text-[11px]">Renders used</span>
                  <strong className="text-ink text-[12px] sm:text-[13px] font-normal">
                    38 <span className="text-muted-2">/ 60 renders</span>
                  </strong>
                </div>
                <div className="bg-sunken h-2 rounded-full overflow-clip">
                  <div className="bg-primary h-full" style={{ width: '63%' }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted text-[11px]">June 2025</span>
                  <span className="text-muted text-[11px]">22 renders remaining</span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 pt-3 border-t border-line-2 text-muted text-[12px] sm:text-[13px] flex-wrap">
                <span>Billing · monthly</span>
                <span>Next renewal · July 24</span>
              </div>
            </section>

            <aside className="border border-line rounded-[6px] p-4 sm:p-6 flex flex-col gap-2 sm:gap-3">
              <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px]">Usage / June</p>
              <p className="text-ink font-bold text-[16px] sm:text-[17px] leading-[28px]">38 rendered studies</p>
              <p className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">Your most active week was the Aster House exterior pass.</p>
              <div className="flex-1" />
              <button
                onClick={() => onNavigate('workspace')}
                className="border border-line text-accent text-[13px] sm:text-[14px] px-4 py-[10px] rounded-[4px] w-full hover:border-accent cursor-pointer transition-colors mt-3 sm:mt-auto"
              >
                Open studio →
              </button>
            </aside>
          </div>

          {/* Plans section */}
          <section className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 sm:gap-0">
              <div>
                <p className="text-muted-2 text-[11px] sm:text-[12px] uppercase tracking-[0.3px]">Plans that stay out of the way</p>
                <h2 className="text-ink font-bold text-[17px] sm:text-[18px] leading-[28px] mt-0.5">Choose your working rhythm</h2>
              </div>
              <span className="text-muted-2 text-[11px]">Billed monthly · demo pricing</span>
            </div>

            {/* Plan cards: 1-col mobile → 1-col sm → 3-col lg */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`flex flex-col gap-2.5 sm:gap-3 p-4 sm:p-5 rounded-[6px] cursor-pointer transition-all text-left w-full ${
                    selectedPlan === plan.id
                      ? 'border-2 border-primary'
                      : 'border border-line hover:border-line-hover'
                  }`}
                >
                  {/* Name + badge row — flex on mobile too */}
                  <div className="flex items-center justify-between">
                    <span className="text-ink text-[13px] sm:text-[14px]">{plan.name}</span>
                    {plan.current && (
                      <span className="border border-line text-ink-4 text-[10px] px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-ink font-bold text-[22px] sm:text-[22px] leading-[32px]">{plan.price}</span>
                    <span className="text-muted-2 text-[13px]">/mo</span>
                  </div>

                  <p className="text-muted text-[12px] sm:text-[13px]">{plan.description}</p>

                  <ul className="flex flex-col gap-1 sm:gap-1.5 pt-1 sm:pt-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-ink-4 text-[12px] sm:text-[13px] leading-[20px]">{f}</li>
                    ))}
                  </ul>

                  <div className="pt-2 sm:pt-3">
                    <span className={`text-[12px] sm:text-[13px] leading-[20px] ${plan.current ? 'text-ink' : 'text-ink-3'}`}>
                      {plan.cta}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
