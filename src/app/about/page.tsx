import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-6xl px-6 pt-24">
        <header className="relative overflow-hidden py-24 lg:py-32">
          <div className="absolute inset-0 z-0">
            <img
              alt="Modern office interior"
              className="h-full w-full object-cover opacity-10 dark:opacity-20"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYGsVLqR5q1ghTzP7MGuwr7jo7WaPiIL7p_5u3UM-0q5LJZXWm1m3UXBV8VKEugBj18z_n6tsAqwvE0pkRkzqBmsLcwWv1ZugIu3J5H3E7_k95bbpUcW_seK1rtqiz84o7GQ-0FE8RsTqeuM9sDKEXHj3e0CjZHwQQnAbEr04WsO0pRSncCPmDN0nvrxhyisIIhLWZ9DxPH59pljCIuvL_cyMJmyF9ssBZaBU7mkk7OZ_rcPs7N5gdzUIrNEToAgcuLcfP6Ue7Dvk"
            />
          </div>
          <div className="relative z-10">
            <div className="max-w-3xl">
              <span className="mb-6 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-primary">
                Our Mission
              </span>
              <h1 className="mb-8 text-5xl font-extrabold leading-tight lg:text-7xl">
                Empowering local businesses to focus on{" "}
                <span className="text-primary">what matters.</span>
              </h1>
              <p className="max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
                We believe financial management should be seamless. Since 2011, IC Multi-Services
                has been dedicated to providing expert accounting and advisory services that help
                families and entrepreneurs grow.
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-24 py-24">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <img
                alt="Team meeting"
                className="rounded-2xl shadow-2xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwgQ9r0x1fKqwiEOo3uWTMrZUW2q4nmLabWacWADbHtDGTxYOxPUx6CWTW1SRv2MN8soAc6d7qhvuTC-rIFb1DJBdJ0TW1X5FuskfUWCLg0ZQjkMY1qh5CGw7yx5Zo8_ShrVq6qbQaX7_kr3ss3CvVoodSJcRR7qd425Sd-DMRNGVs-yKGuXGfCFnTqmLDZQU_X9QZn5RIoVPfL3lliZ2GStmWGgzdQ-rshG5cFjjUXtYZaH4uRFfTf9-m9bY5wwNow9vqXlDn_xI"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="mb-6 text-3xl font-bold">Our Story</h2>
              <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                What started as a small local office in 2011 has grown into a comprehensive
                multi-service hub. We recognized early on that small business owners were spending
                too much time on paperwork and not enough on their passion.
              </p>
              <blockquote className="border-l-4 border-primary py-2 pl-6 text-2xl font-medium italic text-slate-800 dark:text-slate-200">
                &ldquo;Our goal was never just to do taxes, but to become a lifelong partner in our
                clients&apos; success.&rdquo;
              </blockquote>
            </div>
          </div>

          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">The Human Touch</h2>
              <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                In an increasingly digital world, we maintain our &quot;local firm feel&quot; by prioritizing
                face-to-face relationships and personalized advice. Whether you&apos;re a freelance
                model or a restaurant owner, we speak your language.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
                  <span className="material-icons-outlined">verified</span>
                </div>
                <div>
                  <h4 className="font-bold">IRS Authorized Provider</h4>
                  <p className="text-sm text-slate-500">Certified excellence in tax prep</p>
                </div>
              </div>
            </div>
            <div>
              <img
                alt="Consultation"
                className="rounded-2xl shadow-2xl"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCILXsk0CxVqKZwGs2FuqOReqyMUMkZE5R2JmwlWWvRiLQH6zHVZdbxmnwasmTUqVSC_XswW2gU8W8H6BbxO0-i2WNq64AWEc6apRHpVJDsAVMM9B3kku04jvGNsRQO3pX3DI7ryfXt_oZmj5IQb39KJQlgAuKbX61kLf949goQ1ZpDHeB71txSYRm4L2A82R-K3TDV_J06K7DKmXYNoL-vPs_ZZ7o6dtBRSRPE7sqJfRklCtag3iZFCe4hvAR19_lFTlSicYlNMgM"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-24 dark:bg-slate-800/50">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">Core Values</h2>
            <div className="mx-auto h-1.5 w-20 rounded-full bg-primary" />
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border border-slate-100 bg-white p-10 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-icons-outlined text-3xl">handshake</span>
              </div>
              <h3 className="mb-4 text-xl font-bold">Trust &amp; Transparency</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Honesty is at the core of everything we do. We provide clear, straightforward advice
                so you always know where you stand.
              </p>
            </div>
            <div className="group rounded-2xl border border-slate-100 bg-white p-10 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-icons-outlined text-3xl">psychology</span>
              </div>
              <h3 className="mb-4 text-xl font-bold">Innovation</h3>
              <p className="text-slate-600 dark:text-slate-400">
                We leverage the latest technology to streamline your processes, ensuring your
                business stays ahead in a competitive market.
              </p>
            </div>
            <div className="group rounded-2xl border border-slate-100 bg-white p-10 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-icons-outlined text-3xl">groups</span>
              </div>
              <h3 className="mb-4 text-xl font-bold">Community Focused</h3>
              <p className="text-slate-600 dark:text-slate-400">
                We grow when our neighbors grow. We are deeply committed to supporting the success
                of our local business community.
              </p>
            </div>
          </div>
        </section>

        <section className="py-24">
          <h2 className="mb-16 text-center text-3xl font-bold">Our Journey Since 2011</h2>
          <div className="relative">
            <div className="absolute left-0 top-1/2 hidden h-1 w-full -translate-y-1/2 bg-slate-200 dark:bg-slate-800 lg:block" />
            <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-4">
              <div className="text-center lg:text-left">
                <div className="lg:mb-12">
                  <span className="mb-2 inline-block text-4xl font-extrabold text-primary">2011</span>
                  <h4 className="text-lg font-bold">Foundation</h4>
                  <p className="mt-2 text-sm text-slate-500">
                    IC Multi-Services opens its first small office dedicated to local tax preparation.
                  </p>
                </div>
                <div className="mx-auto hidden h-4 w-4 rounded-full bg-primary ring-8 ring-white dark:ring-slate-900 lg:mx-0 lg:block" />
              </div>

              <div className="flex flex-col text-center lg:flex-col-reverse lg:text-left">
                <div className="lg:mt-12">
                  <span className="mb-2 inline-block text-4xl font-extrabold text-primary">2015</span>
                  <h4 className="text-lg font-bold">Expansion</h4>
                  <p className="mt-2 text-sm text-slate-500">
                    Services expand to include business payroll and corporate accounting.
                  </p>
                </div>
                <div className="mx-auto hidden h-4 w-4 rounded-full bg-primary ring-8 ring-white dark:ring-slate-900 lg:mx-0 lg:block" />
              </div>

              <div className="text-center lg:text-left">
                <div className="lg:mb-12">
                  <span className="mb-2 inline-block text-4xl font-extrabold text-primary">2019</span>
                  <h4 className="text-lg font-bold">Tech Integration</h4>
                  <p className="mt-2 text-sm text-slate-500">
                    Launched cloud-based client portals to improve remote accessibility.
                  </p>
                </div>
                <div className="mx-auto hidden h-4 w-4 rounded-full bg-primary ring-8 ring-white dark:ring-slate-900 lg:mx-0 lg:block" />
              </div>

              <div className="flex flex-col text-center lg:flex-col-reverse lg:text-left">
                <div className="lg:mt-12">
                  <span className="mb-2 inline-block text-4xl font-extrabold text-primary">Present</span>
                  <h4 className="text-lg font-bold">Leading Partner</h4>
                  <p className="mt-2 text-sm text-slate-500">
                    A team of 50+ experts serving thousands of diverse clients across industries.
                  </p>
                </div>
                <div className="mx-auto hidden h-4 w-4 rounded-full bg-primary ring-8 ring-white dark:ring-slate-900 lg:mx-0 lg:block" />
              </div>
            </div>
          </div>
        </section>

        
      </main>

      <Footer />
    </div>
  );
}

