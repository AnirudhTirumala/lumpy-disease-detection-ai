import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BrainCircuit, Camera, Check, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';

const steps = [
  { icon: Camera, title: 'Add a clear photo', description: 'Take or upload a picture of the animal you want to check.' },
  { icon: BrainCircuit, title: 'Get an AI screening', description: 'Our model looks for visible signs associated with lumpy skin disease.' },
  { icon: Stethoscope, title: 'Follow up with a vet', description: 'Keep records organised and let a veterinarian review flagged cases.' },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06161c] text-white">
      <div className="absolute inset-0">
        <Image src="/login-bg.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(4,19,25,.98)_0%,rgba(5,21,28,.91)_42%,rgba(5,22,29,.62)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(45,212,191,.2),transparent_29%),radial-gradient(circle_at_78%_13%,rgba(129,140,248,.2),transparent_24%)]" />
      </div>

      <div className="pointer-events-none absolute left-[7%] top-48 h-36 w-36 rounded-full border border-teal-200/10 bg-teal-300/5 blur-sm landing-float" />
      <div className="pointer-events-none absolute bottom-24 right-[9%] h-52 w-52 rounded-full bg-indigo-400/10 blur-3xl landing-float-delayed" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/10 py-5">
          <Link href="/" className="flex items-center gap-3" aria-label="LumpyAI home">
            <Image src="/logo.png" alt="LumpyAI" width={42} height={42} priority className="rounded-xl object-contain" />
            <span className="text-lg font-extrabold tracking-tight">Lumpy<span className="text-teal-300">AI</span></span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex" aria-label="Primary navigation">
            <a href="#about" className="transition hover:text-white">About</a>
            <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-xl px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:px-4">Login</Link>
            <Link href="/register" className="rounded-xl bg-teal-300 px-3.5 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition hover:bg-teal-200 sm:px-4">Sign up</Link>
          </div>
        </header>

        <section className="grid items-center gap-12 py-14 lg:min-h-[650px] lg:grid-cols-[1fr_.92fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-300/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-teal-100">
              <ShieldCheck className="h-4 w-4" /> AI-ASSISTED CATTLE HEALTH SCREENING
            </div>
            <p className="mt-7 text-sm font-bold uppercase tracking-[.23em] text-teal-200">Welcome to LumpyAI</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.7rem]">
              Better herd health starts with <span className="bg-gradient-to-r from-teal-200 via-cyan-100 to-indigo-200 bg-clip-text text-transparent">one clear photo.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              LumpyAI brings early screening, cattle records, and veterinary follow-up into one simple workspace for farmers and animal-health teams.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-300 px-6 py-3.5 font-bold text-slate-950 shadow-xl shadow-teal-950/30 transition hover:-translate-y-0.5 hover:bg-teal-200">
                Login to your account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/[.07] px-6 py-3.5 font-bold text-white backdrop-blur-sm transition hover:border-white/35 hover:bg-white/15">
                Create a free account
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-300">
              {['Photo-based AI screening', 'Cattle records in one place', 'Veterinary case follow-up'].map(item => (
                <span key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-teal-300" /> {item}</span>
              ))}
            </div>
            <p className="mt-5 text-xs text-slate-400">LumpyAI supports veterinary decisions; it does not replace professional diagnosis.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[470px] lg:justify-self-end">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-teal-300/20 via-cyan-300/10 to-indigo-400/20 blur-2xl" />
            <div className="relative min-h-[415px] overflow-hidden rounded-[2rem] border border-white/20 bg-slate-900 shadow-2xl sm:min-h-[490px]">
              <Image src="/login-bg.jpg" alt="Farmer using AI-assisted cattle health tools" fill sizes="(max-width: 640px) 90vw, 470px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071a20] via-[#071a20]/18 to-transparent" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                <div className="rounded-full border border-white/25 bg-slate-950/45 px-3 py-1.5 text-xs font-bold backdrop-blur-md">LIVE HERD VIEW</div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-200/30 bg-teal-300/15 backdrop-blur-md"><HeartPulse className="h-4 w-4 text-teal-100" /></div>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                <p className="text-sm font-semibold text-teal-100">Designed for practical farm decisions</p>
                <p className="mt-1 max-w-xs text-2xl font-extrabold leading-tight">See the signal. Take the next step.</p>
              </div>
            </div>

            <div className="landing-float absolute -left-3 top-20 rounded-2xl border border-white/20 bg-[#0b252c]/90 p-3 shadow-xl backdrop-blur-xl sm:-left-12">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-300/15"><BrainCircuit className="h-4 w-4 text-teal-200" /></span>
                <span><strong className="block text-xs">AI screening ready</strong><span className="text-[11px] text-slate-300">Scan in a few steps</span></span>
              </div>
            </div>
            <div className="landing-float-delayed absolute -bottom-5 -right-2 rounded-2xl border border-white/20 bg-[#14203b]/90 p-3 shadow-xl backdrop-blur-xl sm:-right-9">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-300/15"><Stethoscope className="h-4 w-4 text-indigo-100" /></span>
                <span><strong className="block text-xs">Vet follow-up</strong><span className="text-[11px] text-slate-300">When a case needs review</span></span>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-6 border-y border-white/10 py-12 sm:py-16">
          <div className="grid gap-7 md:grid-cols-[.75fr_1.25fr] md:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.2em] text-teal-200">About the app</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">A clearer path from concern to care.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="rounded-2xl border border-white/10 bg-white/[.055] p-5 text-sm leading-6 text-slate-300">Use LumpyAI to create a consistent digital record for each animal, capture scan history, and identify cases that should be reviewed sooner.</p>
              <p className="rounded-2xl border border-white/10 bg-white/[.055] p-5 text-sm leading-6 text-slate-300">Farmers, veterinarians, and administrators each have a focused workspace that makes communication and follow-up easier.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-6 py-12 sm:py-16">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-teal-200">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Simple enough for every day.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[.045] p-6 transition hover:-translate-y-1 hover:border-teal-200/25 hover:bg-white/[.075]">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-200"><Icon className="h-5 w-5" /></span>
                  <span className="text-sm font-extrabold text-white/30">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/10 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} LumpyAI. Better care for healthier herds.</span>
          <div className="flex gap-4"><Link href="/login" className="hover:text-white">Login</Link><Link href="/register" className="hover:text-white">Sign up</Link></div>
        </footer>
      </div>
    </main>
  );
}
