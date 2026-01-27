import React, { useState } from 'react';
import { analyzeContent, extractBrandStyle, DEMO_CONTENT } from './services/geminiService';
import { PROJECT_TEMPLATES } from './services/templates';
import ModernLayout from './components/ModernLayout';
import StyleConfigurator from './components/StyleConfigurator';
import LayoutConfigurator from './components/LayoutConfigurator';
import { AppState, DesignSystem, ContentType, LayoutConfig } from './types';
import { Loader2, Wand2, Globe, FileText, ArrowRight, LayoutTemplate, Check } from 'lucide-react';

const DEFAULT_DESIGN: DesignSystem = {
  primaryColor: '#0ea5e9',
  secondaryColor: '#0f172a',
  backgroundColor: '#f0f9ff',
  fontFamily: 'sans',
  borderRadius: 'large',
  mood: 'Neutral Modern'
};

const DEFAULT_LAYOUT: LayoutConfig = {
  showHero: true,
  showTOC: true,
  tocPosition: 'right',
  showKeyTakeaways: true,
  showFAQ: true,
  showBenefits: true,
  showProcess: false,
  showTestimonials: false,
  ctaIntensity: 'medium'
};

const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('auto');
  
  const [state, setState] = useState<AppState>({
    step: 'style-setup',
    designSystem: DEFAULT_DESIGN,
    layoutConfig: DEFAULT_LAYOUT,
    data: null,
    error: null,
  });

  const [isLoading, setIsLoading] = useState(false);

  // STEP 1: Analyze URL or Brand
  const handleUrlAnalysis = async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);
    try {
      const design = await extractBrandStyle(urlInput);
      setState(prev => ({ ...prev, designSystem: design }));
    } catch (err) {
      // Fallback or error warning
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Submit Content
  const handleContentAnalysis = async () => {
    if (!contentInput.trim()) return;
    
    setState(prev => ({ ...prev, step: 'analyzing', error: null }));
    try {
      // Analyze content structure with layout configs
      const result = await analyzeContent(contentInput, selectedContentType, state.layoutConfig);
      
      // Override the AI-guessed design with our configured design
      result.designSystem = state.designSystem;
      // Ensure the layout config used is passed through
      result.layoutConfig = state.layoutConfig;
      
      setState({ step: 'view', data: result, designSystem: state.designSystem, layoutConfig: state.layoutConfig, error: null });
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        step: 'content-input', 
        error: err.message || "Failed to process content." 
      }));
    }
  };

  const loadDemo = () => {
     setState({
       step: 'view',
       data: { 
         ...DEMO_CONTENT, 
         designSystem: state.designSystem,
         layoutConfig: state.layoutConfig 
       }, 
       designSystem: state.designSystem,
       layoutConfig: state.layoutConfig,
       error: null
     });
  };

  // --- RENDER STEPS ---

  if (state.step === 'analyzing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[var(--primary)] rounded-full animate-ping opacity-20" style={{ backgroundColor: state.designSystem.primaryColor }}></div>
            <div className="relative bg-gray-50 p-4 rounded-full">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: state.designSystem.primaryColor }} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Generating Layout...</h2>
          <p className="text-gray-500 text-sm">
            Applying your "{state.designSystem.mood}" style to the {selectedContentType} content.
          </p>
        </div>
      </div>
    );
  }

  if (state.step === 'view' && state.data) {
    return (
      <ModernLayout 
        data={state.data} 
        onReset={() => setState(prev => ({ ...prev, step: 'content-input', data: null }))} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Header / Nav */}
        <div className="flex items-center justify-between mb-8 py-4">
          <div className="flex items-center space-x-2">
            <LayoutTemplate className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-xl">ContentFlow<span className="text-brand-600">Optimizer</span></span>
          </div>
          <div className="flex items-center space-x-2 text-sm font-medium">
             <span className={`px-3 py-1 rounded-full ${state.step === 'style-setup' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500'}`}>1. Style</span>
             <div className="w-4 h-0.5 bg-gray-300"></div>
             <span className={`px-3 py-1 rounded-full ${state.step === 'content-input' ? 'bg-brand-600 text-white' : 'bg-white text-gray-500'}`}>2. Content</span>
          </div>
        </div>

        {/* STEP 1: STYLE SETUP */}
        {state.step === 'style-setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                <h1 className="text-2xl font-bold mb-2">Define your Style</h1>
                <p className="text-gray-500 mb-6 text-sm">
                  Let AI analyze your website to automatically setup your brand colors and fonts, or pick a template.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL or Brand Name</label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Globe className="h-4 w-4 text-gray-400" />
                        </div>
                        <input 
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="e.g. www.coolblue.nl"
                          className="pl-10 w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                        />
                      </div>
                      <button 
                        onClick={handleUrlAnalysis}
                        disabled={isLoading || !urlInput.trim()}
                        className="bg-brand-900 text-white px-4 rounded-xl font-medium hover:bg-brand-800 transition-colors disabled:opacity-50 flex items-center"
                      >
                         {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Gemini will deduce the brand style from the URL/Name.
                    </p>
                  </div>

                  <div className="border-t border-gray-100 my-6 pt-6">
                     <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Or choose a preset</label>
                     <div className="grid grid-cols-2 gap-2">
                        {PROJECT_TEMPLATES.filter(t => t.id !== 'auto').map(t => (
                          <button 
                            key={t.id}
                            onClick={() => setState(prev => ({ ...prev, designSystem: t.designSystem }))}
                            className="text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-500 hover:bg-brand-50 text-sm transition-all"
                          >
                            {t.name}
                          </button>
                        ))}
                     </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
               <StyleConfigurator 
                 designSystem={state.designSystem} 
                 onChange={(ds) => setState(prev => ({ ...prev, designSystem: ds }))} 
               />
               <div className="mt-6 flex justify-end">
                 <button 
                   onClick={() => setState(prev => ({ ...prev, step: 'content-input' }))}
                   className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all flex items-center"
                 >
                   Next: Add Content <ArrowRight className="ml-2 w-5 h-5" />
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTENT INPUT & LAYOUT */}
        {state.step === 'content-input' && (
           <div className="max-w-6xl mx-auto">
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
                
                {/* Left: Content Type & Text Input */}
                <div className="p-8 lg:w-7/12 bg-white flex flex-col order-2 lg:order-1">
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Content Type</label>
                        <button 
                         onClick={() => setState(prev => ({ ...prev, step: 'style-setup' }))}
                         className="text-xs underline opacity-50 hover:opacity-100"
                        >
                         Edit Style
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['auto', 'landing-page', 'blog-post', 'ecommerce-product'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedContentType(type as ContentType)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                             selectedContentType === type 
                             ? 'bg-brand-50 border-brand-500 text-brand-700'
                             : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {type === 'auto' ? '✨ Auto-Detect' : type.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-grow flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Paste Content (Text or HTML)</label>
                    <textarea 
                      value={contentInput}
                      onChange={(e) => setContentInput(e.target.value)}
                      placeholder="Paste your raw text, existing HTML, or article draft here..."
                      className="w-full h-80 lg:h-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none bg-gray-50 text-sm"
                    />
                  </div>

                  {state.error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                      {state.error}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                       onClick={handleContentAnalysis}
                       disabled={!contentInput.trim()}
                       className={`px-8 py-3 rounded-xl font-bold text-white flex items-center shadow-lg transition-all ${
                         !contentInput.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 hover:-translate-y-0.5'
                       }`}
                    >
                      Generate Page <ArrowRight className="ml-2 w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Right: Layout Configurator (Sidebar style) */}
                <div className="bg-gray-50 p-6 lg:w-5/12 border-l border-gray-100 flex flex-col order-1 lg:order-2">
                   <h2 className="text-lg font-bold mb-4 flex items-center">
                     <LayoutTemplate className="w-5 h-5 mr-2 text-gray-500" />
                     Configure Layout
                   </h2>
                   
                   <LayoutConfigurator 
                     config={state.layoutConfig}
                     onChange={(cfg) => setState(prev => ({ ...prev, layoutConfig: cfg }))}
                   />

                   <div className="mt-auto pt-6">
                      <button onClick={loadDemo} className="w-full py-3 rounded-lg bg-white hover:bg-gray-100 text-sm font-medium border border-gray-200 text-gray-600">
                        Load Demo Content
                      </button>
                   </div>
                </div>

             </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default App;