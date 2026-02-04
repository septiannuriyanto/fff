import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Fuel, 
  BarChart3, 
  ShieldCheck, 
  Truck, 
  Database, 
  Users, 
  Zap,
  ChevronRight,
  Menu,
  X,
  ArrowRight
} from 'lucide-react';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      title: 'Real-time Monitoring',
      description: 'Monitor fuel consumption and stock levels in real-time across all fleet units.',
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
    },
    {
      title: 'Inventory Management',
      description: 'Optimize your fuel and oil stock with automated tracking and alerts.',
      icon: <Database className="w-8 h-8 text-primary" />,
    },
    {
      title: 'Fleet Efficiency',
      description: 'Analyze ritation and operational data to improve overall fleet performance.',
      icon: <Truck className="w-8 h-8 text-primary" />,
    },
    {
      title: 'Secure & Compliant',
      description: 'Role-based access control and detailed audit logs for full compliance.',
      icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    },
  ];

  const stats = [
    { label: 'Active Units', value: '450+' },
    { label: 'Fuel Monitored', value: '1.2M L' },
    { label: 'Daily Ritations', value: '1,500+' },
    { label: 'Uptime', value: '99.9%' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-boxdark text-black dark:text-white font-satoshi overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-boxdark/90 backdrop-blur-md shadow-md py-4' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Fuel className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">FFF <span className="text-primary">Project</span></span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className="font-medium hover:text-primary transition-colors">About</a>
            <a href="#features" className="font-medium hover:text-primary transition-colors">Features</a>
            <a href="#stats" className="font-medium hover:text-primary transition-colors">Impact</a>
            <Link to="/auth/signin" className="bg-primary hover:bg-opacity-90 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg shadow-primary/25 flex items-center gap-2 group">
              Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-black dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-boxdark shadow-xl border-t border-stroke dark:border-strokedark p-6 flex flex-col gap-4 animate-fade-in-down">
            <a href="#about" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">About</a>
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">Features</a>
            <a href="#stats" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">Impact</a>
            <Link to="/auth/signin" className="bg-primary text-white p-3 rounded-xl font-bold text-center">Open Dashboard</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Premium Blue Gradient Background */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-boxdark dark:via-boxdark-2 dark:to-primary/10 transition-colors duration-500"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-8 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-wide uppercase">
              <Zap className="w-4 h-4" /> Powering Fleet Efficiency
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
              Fuel Feasibility <br />
              <span className="text-primary italic">for Fleet</span>
            </h1>
            <p className="text-lg md:text-xl text-body dark:text-bodydark leading-relaxed">
              The ultimate fuel management dashboard. Track consumption, manage inventory, and optimize your fleet operations with data-driven insights. Built for precision and scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/auth/signin" className="bg-primary hover:bg-opacity-90 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group">
                Access Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#features" className="bg-white dark:bg-boxdark border-2 border-primary/20 hover:border-primary px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2">
                Learn More
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-30 rounded-full"></div>
            <div className="relative bg-white dark:bg-boxdark-2 p-4 rounded-3xl shadow-2xl border border-stroke dark:border-strokedark overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200" 
                alt="Fleet Dashboard Mockup" 
                className="rounded-2xl transition-transform hover:scale-105 duration-700"
              />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl pulse">
                <BarChart3 className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-meta-4">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-primary font-bold tracking-widest uppercase text-sm">Features</h2>
            <h3 className="text-4xl md:text-5xl font-extrabold">Next-Gen Management Tools</h3>
            <p className="text-lg text-body dark:text-bodydark">Everything you need to manage your fleet's fuel and oil ecosystem in one centralized, powerful platform.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-boxdark p-8 rounded-3xl border border-stroke dark:border-strokedark hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  {React.cloneElement(feature.icon, { className: "w-8 h-8 transition-colors duration-300" })}
                </div>
                <h4 className="text-xl font-bold mb-4">{feature.title}</h4>
                <p className="text-body dark:text-bodydark-2 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-24 bg-primary text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.3),transparent)]"></div>
        <div className="container mx-auto px-6 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-4xl md:text-6xl font-black">{stat.value}</div>
                <div className="text-primary-light font-medium uppercase tracking-widest text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6 pt-12">
                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center">
                  <Fuel className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h5 className="font-bold">Fuel Mgmt</h5>
                </div>
                <div className="bg-meta-3/5 p-6 rounded-3xl border border-meta-3/10 text-center">
                  <Database className="w-12 h-12 text-meta-3 mx-auto mb-4" />
                  <h5 className="font-bold">Infrastructure</h5>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-meta-5/5 p-6 rounded-3xl border border-meta-5/10 text-center">
                  <Users className="w-12 h-12 text-meta-5 mx-auto mb-4" />
                  <h5 className="font-bold">Manpower</h5>
                </div>
                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center">
                  <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h5 className="font-bold">Operational</h5>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">Comprehensive Ecosystem for <span className="text-primary underline">Fleet Excellence</span></h2>
              <p className="text-lg text-body dark:text-bodydark leading-relaxed">
                FFF Project is not just a dashboard; it's a complete ecosystem designed to bridge the gap between field operations and management decisions. From the moment fuel enters the tank to the final ritation report, every drop is accounted for.
              </p>
              <ul className="space-y-4">
                {[
                  'Automated Daily Stock Reconciliation',
                  'Garda LOTO Session Management',
                  'Real-time Flowmeter & Totaliser Monitoring',
                  'Comprehensive Operational Reporting'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="p-1 rounded-full bg-primary/20">
                      <ChevronRight className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-6">
                 <Link to="/auth/signin" className="inline-flex items-center gap-3 text-primary font-bold text-xl group">
                   Get Started Today <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                 </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl bg-boxdark dark:bg-primary rounded-[40px] p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mb-32 -mr-32"></div>
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -mt-16 -ml-16"></div>
          
          <h2 className="text-4xl md:text-6xl font-black mb-8 relative z-10">Ready to optimize your fleet?</h2>
          <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto relative z-10">
            Join the hundreds of fleet operators who have transformed their fuel management operations with FFF Project.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center relative z-10">
            <Link to="/auth/signin" className="bg-white text-primary hover:bg-opacity-95 px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all">
              Launch Dashboard
            </Link>
            <a href="mailto:contact@fff-project.com" className="bg-transparent border-2 border-white/30 hover:border-white px-10 py-5 rounded-2xl font-bold text-xl transition-all">
              Contact Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-stroke dark:border-strokedark">
        <div className="container mx-auto px-6 flex flex-col md:row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold">FFF <span className="text-primary">Project</span></span>
          </div>
          <div className="flex gap-8 text-body dark:text-bodydark-2 font-medium">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
          </div>
          <div className="text-body dark:text-bodydark-2 text-sm">
            © {new Date().getFullYear()} FFF Project. All rights reserved.
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
        .pulse {
          animation: pulse-animation 2s infinite;
        }
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0px rgba(59, 90, 246, 0.4); }
          100% { box-shadow: 0 0 0 30px rgba(59, 90, 246, 0); }
        }
      `}} />
    </div>
  );
};

export default LandingPage;
