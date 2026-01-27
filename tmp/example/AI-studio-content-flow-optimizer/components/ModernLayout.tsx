import React, { useState, useEffect } from 'react';
import { AnalyzedContent } from '../types';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Phone, 
  Menu, 
  X,
  ClipboardList,
  Palette,
  Download,
  RotateCcw,
  Star,
  Quote,
  ShieldCheck,
  Check
} from 'lucide-react';

interface ModernLayoutProps {
  data: AnalyzedContent;
  onReset: () => void;
}

const ModernLayout: React.FC<ModernLayoutProps> = ({ data, onReset }) => {
  const [activeSection, setActiveSection] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Derive styles from design system
  const { designSystem, layoutConfig } = data;
  
  const fontClass = {
    'sans': 'font-sans',
    'serif': 'font-serif',
    'mono': 'font-mono'
  }[designSystem.fontFamily] || 'font-sans';

  const radiusClass = {
    'none': 'rounded-none',
    'small': 'rounded',
    'large': 'rounded-xl',
    'full': 'rounded-3xl'
  }[designSystem.borderRadius] || 'rounded-xl';

  // Dynamic CSS variables for colors
  const styleVars = {
    '--primary': designSystem.primaryColor,
    '--secondary': designSystem.secondaryColor,
    '--bg-tint': designSystem.backgroundColor,
  } as React.CSSProperties;

  // Safe accessors for arrays
  const sections = data.sections || [];
  const keyTakeaways = data.keyTakeaways || [];
  const faq = data.faq || [];
  const benefits = data.benefits || [];
  const process = data.process || [];
  const testimonials = data.testimonials || [];

  useEffect(() => {
    const handleScroll = () => {
      const sectionEls = document.querySelectorAll('section[id]');
      let current = '';
      sectionEls.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          current = section.getAttribute('id') || '';
        }
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100, // Offset for sticky header
        behavior: 'smooth'
      });
      setMobileMenuOpen(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // Helper to render a CTA Block
  const CtaBlock = () => (
    <div className={`my-12 p-8 bg-[var(--primary)] ${radiusClass} text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      <div className="relative z-10">
        <h3 className="text-xl font-bold mb-2">Heeft u interesse?</h3>
        <p className="text-white/90 max-w-lg">{data.callToActionText}</p>
      </div>
      <button className={`whitespace-nowrap bg-white text-[var(--primary)] font-bold py-3 px-8 ${radiusClass} hover:bg-gray-50 transition-colors shadow-sm relative z-10`}>
        Offerte Aanvragen
      </button>
    </div>
  );

  const handleDownload = () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-page-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className={`min-h-screen bg-white flex flex-col ${fontClass}`} 
      style={styleVars}
    >
      {/* Admin Bar */}
      <div className="bg-gray-900 text-white py-2 px-4 flex justify-between items-center text-xs z-[60] relative">
         <div className="flex items-center space-x-4">
            <span className="flex items-center opacity-80"><Palette className="w-3 h-3 mr-2" /> Style: {designSystem.mood}</span>
            <span className="hidden sm:inline opacity-50">|</span>
            <span className="hidden sm:inline opacity-80">{data.contentType}</span>
         </div>
         <div className="flex items-center space-x-3">
            <button onClick={onReset} className="flex items-center hover:text-[var(--primary)] transition-colors">
              <RotateCcw className="w-3 h-3 mr-1" /> Change Style
            </button>
            <button onClick={handleDownload} className="bg-[var(--primary)] text-white px-3 py-1 rounded hover:opacity-90 transition-all flex items-center font-bold">
              <Download className="w-3 h-3 mr-1" /> Download HTML
            </button>
         </div>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center cursor-pointer" onClick={() => scrollTo('top')}>
               <div className={`w-10 h-10 bg-[var(--primary)] ${radiusClass} flex items-center justify-center mr-3 shadow-lg opacity-90`}>
                 <ClipboardList className="text-white w-6 h-6" />
               </div>
               <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">
                 Content<span style={{ color: 'var(--primary)' }}>Optimizer</span>
               </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
               <nav className="flex space-x-6 text-sm font-medium text-gray-600">
                 {layoutConfig.showKeyTakeaways && keyTakeaways.length > 0 && <button onClick={() => scrollTo('overview')} className="hover:text-[var(--primary)] transition-colors">Overzicht</button>}
                 <button onClick={() => scrollTo('services')} className="hover:text-[var(--primary)] transition-colors">Informatie</button>
                 {layoutConfig.showProcess && process.length > 0 && <button onClick={() => scrollTo('process')} className="hover:text-[var(--primary)] transition-colors">Werkwijze</button>}
                 {layoutConfig.showFAQ && faq.length > 0 && <button onClick={() => scrollTo('faq')} className="hover:text-[var(--primary)] transition-colors">FAQ</button>}
               </nav>
               <button 
                className={`bg-[var(--primary)] text-white px-6 py-2.5 ${radiusClass} font-medium hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center`}
               >
                 <span>Contact</span>
                 <ArrowRight className="w-4 h-4 ml-2" />
               </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
           <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-4 shadow-lg absolute w-full">
             {sections.map((section, idx) => (
               <button 
                key={idx} 
                onClick={() => scrollTo(`section-${idx}`)}
                className="block w-full text-left py-2 text-gray-700 font-medium"
               >
                 {section.heading}
               </button>
             ))}
             <button className={`w-full bg-[var(--primary)] text-white py-3 ${radiusClass} font-medium mt-4`}>
               {data.callToActionText}
             </button>
           </div>
        )}
      </header>

      {/* Hero Section */}
      {layoutConfig.showHero && (
        <div id="top" className="relative bg-[var(--secondary)] text-white overflow-hidden">
          <div className="absolute inset-0 opacity-40">
              <img 
                src={`https://picsum.photos/seed/${data.heroImageKeyword || 'abstract'}/1600/900`} 
                alt="Hero background" 
                className="w-full h-full object-cover"
              />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--secondary)] via-[var(--secondary)]/80 to-transparent"></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                {data.title}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-2xl">
                {data.summary}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className={`bg-white text-[var(--secondary)] px-8 py-4 ${radiusClass} font-bold hover:bg-gray-100 transition-all shadow-xl flex items-center justify-center`}>
                  {data.callToActionText}
                </button>
                <button className={`bg-transparent border border-white/30 text-white px-8 py-4 ${radiusClass} font-semibold hover:bg-white/10 transition-all flex items-center justify-center`}>
                  <Phone className="w-5 h-5 mr-2" />
                  Bel direct
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* If No Hero, show basic title block */}
      {!layoutConfig.showHero && (
        <div id="top" className="bg-[var(--secondary)] text-white py-12">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl md:text-4xl font-bold">{data.title}</h1>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          
          {/* Main Content Column */}
          <div className={`${layoutConfig.showTOC ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-16 ${layoutConfig.tocPosition === 'left' ? 'order-last' : 'order-first'}`}>
            
            {/* Key Takeaways */}
            {layoutConfig.showKeyTakeaways && keyTakeaways.length > 0 && (
              <div id="overview" className={`bg-[var(--bg-tint)] border border-[var(--primary)]/20 ${radiusClass} p-6 md:p-8 shadow-sm`}>
                <h3 className="text-xl font-bold text-[var(--secondary)] mb-6 flex items-center">
                  <ClipboardList className="w-6 h-6 mr-3 text-[var(--primary)]" />
                  Belangrijkste Punten
                </h3>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-[var(--primary)] mr-3 mt-1 flex-shrink-0" />
                      <span className="text-gray-800 text-base leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits Block */}
            {layoutConfig.showBenefits && benefits.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {benefits.map((benefit, idx) => (
                    <div key={idx} className={`p-6 border border-gray-100 shadow-sm ${radiusClass} hover:shadow-md transition-all text-center group`}>
                       <div className="w-12 h-12 mx-auto bg-[var(--bg-tint)] rounded-full flex items-center justify-center mb-4 text-[var(--primary)] group-hover:scale-110 transition-transform">
                          <ShieldCheck className="w-6 h-6" />
                       </div>
                       <h4 className="font-bold text-gray-900 mb-2">{benefit.title}</h4>
                       <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                 ))}
              </div>
            )}

            {/* Content Sections */}
            <div id="services" className="space-y-16">
              {sections.map((section, idx) => {
                 // Logic for CTA placement
                 const isMiddle = idx === Math.floor(sections.length / 2) - 1;
                 const showMidCta = layoutConfig.ctaIntensity === 'medium' && isMiddle;
                 const showHighCta = layoutConfig.ctaIntensity === 'high' && (idx + 1) % 2 === 0 && idx !== sections.length - 1;
                 
                 return (
                  <React.Fragment key={idx}>
                    <section 
                      id={`section-${idx}`} 
                      className="scroll-mt-32"
                    >
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 relative inline-block">
                        {section.heading}
                        <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-[var(--primary)] rounded-full"></span>
                      </h2>
                      
                      <div 
                        className="prose-content text-gray-600 leading-8 max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </section>
                    
                    {(showMidCta || showHighCta) && <CtaBlock />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Process Steps */}
            {layoutConfig.showProcess && process.length > 0 && (
              <section id="process" className="scroll-mt-32">
                <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Hoe wij werken</h2>
                <div className="relative">
                  {/* Line connector for large screens */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 hidden md:block -translate-x-1/2"></div>
                  
                  <div className="space-y-8">
                    {process.map((step, idx) => (
                       <div key={idx} className={`flex items-center ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} flex-col relative`}>
                          {/* Dot */}
                          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--primary)] text-white font-bold items-center justify-center z-10 border-4 border-white">
                            {idx + 1}
                          </div>

                          <div className="md:w-1/2 p-4"></div>
                          <div className="md:w-1/2 p-4 text-center md:text-left">
                             <div className={`p-6 bg-gray-50 border border-gray-100 ${radiusClass} shadow-sm relative`}>
                                <div className="md:hidden absolute -top-3 left-6 bg-[var(--primary)] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                                <h4 className="font-bold text-lg mb-2">{step.title}</h4>
                                <p className="text-gray-600 text-sm">{step.description}</p>
                             </div>
                          </div>
                       </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Testimonials */}
            {layoutConfig.showTestimonials && testimonials.length > 0 && (
              <div className={`bg-[var(--secondary)] ${radiusClass} p-8 md:p-12 text-white text-center`}>
                <Quote className="w-12 h-12 mx-auto text-[var(--primary)] opacity-50 mb-6" />
                <div className="max-w-3xl mx-auto space-y-8">
                   {testimonials.map((t, idx) => (
                     <div key={idx}>
                       <p className="text-xl md:text-2xl font-serif italic opacity-90 mb-4 leading-relaxed">"{t.quote}"</p>
                       <p className="font-bold text-[var(--primary)]">— {t.author}</p>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {/* Bottom CTA */}
            {layoutConfig.ctaIntensity !== 'none' && (
              <CtaBlock />
            )}

            {/* FAQ Section */}
            {layoutConfig.showFAQ && faq.length > 0 && (
              <section id="faq" className="scroll-mt-32 pt-8 border-t border-gray-100">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Veelgestelde Vragen</h2>
                <div className="space-y-4">
                  {faq.map((item, idx) => (
                    <div key={idx} className={`border border-gray-200 ${radiusClass} overflow-hidden hover:border-[var(--primary)] transition-colors bg-white`}>
                      <button 
                          onClick={() => toggleFaq(idx)}
                          className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-[var(--bg-tint)] transition-colors focus:outline-none"
                      >
                        <span className="font-semibold text-gray-900 text-lg">{item.question}</span>
                        {openFaqIndex === idx ? <ChevronUp className="text-[var(--primary)]" /> : <ChevronDown className="text-gray-400" />}
                      </button>
                      <div 
                          className={`transition-all duration-300 ease-in-out ${
                            openFaqIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          } overflow-hidden`}
                      >
                        <div className="p-5 pt-0 text-gray-600 leading-relaxed border-t border-gray-100 bg-[var(--bg-tint)]/50">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sticky Sidebar / Table of Contents */}
          {layoutConfig.showTOC && (
            <aside className={`hidden lg:block lg:col-span-4 relative ${layoutConfig.tocPosition === 'left' ? 'order-first' : 'order-last'}`}>
              <div className="sticky top-28 space-y-8">
                
                {/* TOC Card */}
                <div className={`bg-white ${radiusClass} shadow-lg shadow-gray-200/50 border border-gray-100 p-6`}>
                  <h4 className="font-bold text-gray-900 mb-4 uppercase text-xs tracking-wider">Inhoudsopgave</h4>
                  <nav className="space-y-1">
                    {layoutConfig.showKeyTakeaways && keyTakeaways.length > 0 && (
                      <button 
                          onClick={() => scrollTo('overview')}
                          className={`block w-full text-left px-3 py-2 ${designSystem.borderRadius === 'none' ? '' : 'rounded-md'} text-sm transition-all duration-200 ${
                            activeSection === 'overview' 
                              ? 'bg-[var(--bg-tint)] text-[var(--secondary)] font-medium translate-x-1' 
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                      >
                        Overzicht & Hoofdpunten
                      </button>
                    )}
                    
                    {sections.map((section, idx) => (
                      <button
                          key={idx}
                          onClick={() => scrollTo(`section-${idx}`)}
                          className={`block w-full text-left px-3 py-2 ${designSystem.borderRadius === 'none' ? '' : 'rounded-md'} text-sm transition-all duration-200 ${
                            activeSection === `section-${idx}`
                              ? 'bg-[var(--bg-tint)] text-[var(--secondary)] font-medium translate-x-1'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                      >
                        {section.heading}
                      </button>
                    ))}

                    {layoutConfig.showFAQ && faq.length > 0 && (
                      <button 
                        onClick={() => scrollTo('faq')}
                        className={`block w-full text-left px-3 py-2 ${designSystem.borderRadius === 'none' ? '' : 'rounded-md'} text-sm transition-all duration-200 ${
                          activeSection === 'faq' 
                            ? 'bg-[var(--bg-tint)] text-[var(--secondary)] font-medium translate-x-1' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        Veelgestelde Vragen
                      </button>
                    )}
                  </nav>
                </div>

                {/* Sidebar CTA */}
                {layoutConfig.ctaIntensity !== 'none' && (
                  <div className={`bg-[var(--primary)] ${radiusClass} shadow-xl p-6 text-white text-center`}>
                    <h4 className="font-bold text-lg mb-2">Hulp nodig?</h4>
                    <p className="text-white/90 text-sm mb-6">Wij helpen u graag verder met onze diensten. Vraag direct een offerte aan.</p>
                    <button className={`w-full bg-white text-[var(--primary)] font-bold py-3 ${radiusClass} hover:bg-gray-50 transition-colors shadow-sm`}>
                      Gratis Offerte
                    </button>
                  </div>
                )}
                
                {benefits.length > 0 && layoutConfig.showBenefits && (
                   <div className="space-y-2">
                      {benefits.map((b, i) => (
                        <div key={i} className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                           <Check className="w-4 h-4 text-[var(--primary)] mr-2" />
                           {b.title}
                        </div>
                      ))}
                   </div>
                )}

              </div>
            </aside>
          )}

        </div>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12 mt-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4 text-sm">&copy; 2024. All rights reserved.</p>
          <p className="text-xs text-gray-500">Optimized with Gemini</p>
        </div>
      </footer>
    </div>
  );
};

export default ModernLayout;