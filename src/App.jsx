import React, { useState, useEffect } from 'react';
import './App.css';
import { individualFormFields, corporateFormFields, formSubmissionInstructions } from './formFields.js';
import EnhancedIBOSSPortfolioTracker from './components/EnhancedIBOSSPortfolioTracker.jsx';

const AlhambraBankApp = () => {
  // Core state management
  const [currentTab, setCurrentTab] = useState('home');
  const [language, setLanguage] = useState('en');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [accountType, setAccountType] = useState('individual');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  // Slideshow states
  const [currentSlide, setCurrentSlide] = useState(0);
  const [caymanSlide, setCaymanSlide] = useState(0);

  // Alhambra Palace images - Authentic images from Granada, Spain
  const alhambraImages = [
    { src: '/images/alhambra/2ifBxNBK7uoj.jpg', title: 'Court of the Lions' },
    { src: '/images/alhambra/GgvjCNfklBIz.jpg', title: 'Court of the Lions - Detail' },
    { src: '/images/alhambra/BIaA83jfMqEC.jpg', title: 'Palace Courtyard' },
    { src: '/images/alhambra/5x24DQqcgFKU.jpg', title: 'Architectural Marvel' },
    { src: '/images/alhambra/BoDCpkXLqd4X.jpg', title: 'Islamic Architecture' },
    { src: '/images/alhambra/hXRYB0t5qXOn.jpg', title: 'Palace Gardens' },
    { src: '/images/alhambra/8zSX0ZmtLvaE.jpg', title: 'Artistic Details' },
    { src: '/images/alhambra/GH2oInCpezGO.jpeg', title: 'Historical Grandeur' }
  ];

  // Cayman Islands images - Authentic images from Grand Cayman
  const caymanImages = [
    { src: '/images/cayman/QQDNcVkOCLhf.jpg', title: 'Seven Mile Beach Paradise' },
    { src: '/images/cayman/G3wwKTwzXWE9.jpg', title: 'Grand Cayman Beach' },
    { src: '/images/cayman/XOKAmns42iuM.jpg', title: 'Seven Mile Beach' },
    { src: '/images/cayman/uvhjaEVHEcmU.jpg', title: 'Financial District' },
    { src: '/images/cayman/ZwS9Weot45dz.jpg', title: 'Banking Hub' },
    { src: '/images/cayman/tRrXLk1YNwjW.jpg', title: 'Cayman Coastline' }
  ];

  // Auto-advance slideshows
  useEffect(() => {
    const alhambraTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % alhambraImages.length);
    }, 10000); // 10 seconds

    const caymanTimer = setInterval(() => {
      setCaymanSlide((prev) => (prev + 1) % caymanImages.length);
    }, 6000); // 6 seconds for Cayman Islands

    return () => {
      clearInterval(alhambraTimer);
      clearInterval(caymanTimer);
    };
  }, []);

  // Translations
  const translations = {
    en: {
      title: "Alhambra Bank & Trust",
      tagline1: "MANAGING YOUR WEALTH",
      tagline2: "PROTECTING YOUR LEGACY",
      openAccount: "Open Account",
      openIndividual: "👤 Open Individual Account",
      openCorporate: "🏢 Open Corporate Account",
      home: "Home",
      about: "About",
      services: "Services",
      trading: "Trading",
      marketInsights: "Market Insights",
      aiServices: "AI Services",
      portfolioTracker: "Portfolio Tracker",
      blog: "Blog",
      contact: "Contact",
      customerLogin: "Customer Login",
      scheduleCall: "Schedule a Call",
      // Social Media & Communication
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      facebook: "Facebook",
      twitter: "Twitter",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      youtube: "YouTube",
      livechat: "Live Chat",
      videocall: "Video Call",
      phonecall: "Phone Call",
      email: "Email",
      // Portfolio Tracker
      totalEquity: "Total Equity",
      dayPL: "Day P&L",
      cashBalance: "Cash Balance",
      buyingPower: "Buying Power",
      overview: "Overview",
      holdings: "Holdings",
      performance: "Performance",
      allocation: "Allocation",
      statements: "Statements",
      logout: "Logout"
    },
    es: {
      title: "Alhambra Bank & Trust",
      tagline1: "GESTIONANDO SU RIQUEZA",
      tagline2: "PROTEGIENDO SU LEGADO",
      openAccount: "Abrir Cuenta",
      openIndividual: "👤 Abrir Cuenta Individual",
      openCorporate: "🏢 Abrir Cuenta Corporativa",
      home: "Inicio",
      about: "Acerca de",
      services: "Servicios",
      trading: "Trading",
      marketInsights: "Perspectivas del Mercado",
      aiServices: "Servicios IA",
      portfolioTracker: "Rastreador de Cartera",
      blog: "Blog",
      contact: "Contacto",
      customerLogin: "Acceso Cliente",
      scheduleCall: "Programar Llamada",
      // Social Media & Communication
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      facebook: "Facebook",
      twitter: "Twitter",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      youtube: "YouTube",
      livechat: "Chat en Vivo",
      videocall: "Videollamada",
      phonecall: "Llamada",
      email: "Correo",
      // Portfolio Tracker
      totalEquity: "Patrimonio Total",
      dayPL: "P&G del Día",
      cashBalance: "Saldo en Efectivo",
      buyingPower: "Poder de Compra",
      overview: "Resumen",
      holdings: "Tenencias",
      performance: "Rendimiento",
      allocation: "Asignación",
      statements: "Estados",
      logout: "Cerrar Sesión"
    },
    ar: {
      title: "بنك الحمراء والثقة",
      tagline1: "إدارة ثروتكم",
      tagline2: "حماية إرثكم",
      openAccount: "فتح حساب",
      openIndividual: "👤 فتح حساب فردي",
      openCorporate: "🏢 فتح حساب شركة",
      home: "الرئيسية",
      about: "حول",
      services: "الخدمات",
      trading: "التداول",
      marketInsights: "رؤى السوق",
      aiServices: "خدمات الذكاء الاصطناعي",
      portfolioTracker: "متتبع المحفظة",
      blog: "المدونة",
      contact: "اتصل",
      customerLogin: "دخول العميل",
      scheduleCall: "جدولة مكالمة",
      // Social Media & Communication
      whatsapp: "واتساب",
      telegram: "تيليجرام",
      facebook: "فيسبوك",
      twitter: "تويتر",
      instagram: "إنستغرام",
      linkedin: "لينكد إن",
      youtube: "يوتيوب",
      livechat: "دردشة مباشرة",
      videocall: "مكالمة فيديو",
      phonecall: "مكالمة هاتفية",
      email: "بريد إلكتروني",
      // Portfolio Tracker
      totalEquity: "إجمالي الأسهم",
      dayPL: "ربح/خسارة اليوم",
      cashBalance: "الرصيد النقدي",
      buyingPower: "القوة الشرائية",
      overview: "نظرة عامة",
      holdings: "الممتلكات",
      performance: "الأداء",
      allocation: "التوزيع",
      statements: "البيانات",
      logout: "تسجيل الخروج"
    },
    zh: {
      title: "阿尔罕布拉银行信托",
      tagline1: "管理您的财富",
      tagline2: "保护您的遗产",
      openAccount: "开户",
      openIndividual: "👤 开设个人账户",
      openCorporate: "🏢 开设企业账户",
      home: "首页",
      about: "关于",
      services: "服务",
      trading: "交易",
      marketInsights: "市场洞察",
      aiServices: "AI服务",
      portfolioTracker: "投资组合跟踪器",
      blog: "博客",
      contact: "联系",
      customerLogin: "客户登录",
      scheduleCall: "预约通话",
      // Social Media & Communication
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      facebook: "Facebook",
      twitter: "Twitter",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      youtube: "YouTube",
      livechat: "在线聊天",
      videocall: "视频通话",
      phonecall: "电话",
      email: "邮件",
      // Portfolio Tracker
      totalEquity: "总权益",
      dayPL: "日损益",
      cashBalance: "现金余额",
      buyingPower: "购买力",
      overview: "概览",
      holdings: "持仓",
      performance: "表现",
      allocation: "配置",
      statements: "报表",
      logout: "登出"
    }
  };

  const t = translations[language];

  const renderContent = () => {
    switch (currentTab) {
      case 'home': return renderHome();
      case 'about': return renderAbout();
      case 'services': return renderServices();
      case 'trading': return renderTrading();
      case 'marketInsights': return renderMarketInsights();
      case 'aiServices': return renderAIServices();
      case 'portfolioTracker': return <EnhancedIBOSSPortfolioTracker />;
      case 'blog': return renderBlog();
      case 'contact': return renderContact();
      default: return renderHome();
    }
  };

  // ... (rest of the component remains the same)

  // Navigation tabs
  const tabs = [
    { id: 'home', label: t.home },
    { id: 'about', label: t.about },
    { id: 'services', label: t.services },
    { id: 'trading', label: t.trading },
    { id: 'marketInsights', label: t.marketInsights },
    { id: 'aiServices', label: t.aiServices },
    { id: 'portfolioTracker', label: t.portfolioTracker },
    { id: 'blog', label: t.blog },
    { id: 'contact', label: t.contact }
  ];

  return (
    <div className="font-sans bg-white text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/alhambra-logo.png" alt="Alhambra Bank & Trust Logo" className="h-12" />
            <h1 className="text-xl font-bold text-red-800">{t.title}</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setCurrentTab(tab.id)} className={`text-gray-600 hover:text-red-700 transition-colors ${currentTab === tab.id ? 'font-semibold text-red-700' : ''}`}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center space-x-4">
            <button className="bg-red-700 text-white px-4 py-2 rounded-full hover:bg-red-800 transition-colors">
              {t.customerLogin}
            </button>
            <select onChange={(e) => setLanguage(e.target.value)} value={language} className="border rounded-md p-2">
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ar">العربية</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Alhambra Bank & Trust</h3>
            <p className="text-sm text-gray-400">Your trusted partner in wealth management and legacy protection.</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {tabs.map(tab => (
                <li key={tab.id}><button onClick={() => setCurrentTab(tab.id)} className="text-gray-400 hover:text-white">{tab.label}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Contact Us</h3>
            <p className="text-sm text-gray-400">123 Alhambra Ave, Grand Cayman, Cayman Islands</p>
            <p className="text-sm text-gray-400">contact@alhambrabank.ky</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">FB</a>
              <a href="#" className="text-gray-400 hover:text-white">TW</a>
              <a href="#" className="text-gray-400 hover:text-white">IN</a>
              <a href="#" className="text-gray-400 hover:text-white">LI</a>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-8 text-center text-sm text-gray-500">
          <p>&copy; 2025 Alhambra Bank & Trust. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );

  function renderHome() {
    return (
      <div className="relative h-screen text-white">
        <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>
        <div className="absolute inset-0 w-full h-full">
          {alhambraImages.map((image, index) => (
            <img
              key={index}
              src={image.src}
              alt={image.title}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
        <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-4">
            {t.tagline1}<br />{t.tagline2}
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mb-8">A private bank and trust company for those who value discretion, security, and personalized service.</p>
          <button onClick={() => setShowOnboarding(true)} className="bg-red-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-red-800 transition-transform hover:scale-105">
            {t.openAccount}
          </button>
        </div>
      </div>
    );
  }

  function renderAbout() {
    return (
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">About Alhambra Bank & Trust</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
            <p className="text-lg text-gray-700 mb-6">To provide unparalleled financial services with integrity, discretion, and a commitment to preserving and growing our clients' wealth for generations to come.</p>
            <h3 className="text-2xl font-semibold mb-4">Our Vision</h3>
            <p className="text-lg text-gray-700">To be the leading private bank and trust in the Cayman Islands, renowned for our client-centric approach, innovative solutions, and unwavering dedication to excellence.</p>
          </div>
          <div>
            <img src="/images/cayman/financial-district.jpg" alt="Cayman Islands Financial District" className="rounded-lg shadow-lg" />
          </div>
        </div>
      </div>
    );
  }

  function renderServices() {
    const services = [
      { title: "Private Banking", description: "Exclusive banking services tailored to your unique financial needs." },
      { title: "Wealth Management", description: "Holistic wealth management strategies to grow and protect your assets." },
      { title: "Trust & Fiduciary", description: "Comprehensive trust and fiduciary services for seamless succession planning." },
      { title: "Investment Advisory", description: "Expert investment advice to help you navigate the global financial markets." },
      { title: "Corporate Services", description: "A full suite of corporate services for your business needs in the Cayman Islands." },
      { title: "Digital Asset Banking", description: "Secure and regulated banking services for the evolving world of digital assets." }
    ];

    return (
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Our Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-semibold mb-4">{service.title}</h3>
              <p className="text-gray-700 mb-6">{service.description}</p>
              <button className="bg-red-700 text-white px-6 py-2 rounded-full hover:bg-red-800 transition-colors">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderTrading() { return <div className="container mx-auto px-4 py-16"><h2 className="text-4xl font-bold text-center">Trading</h2></div>; }
  function renderMarketInsights() { return <div className="container mx-auto px-4 py-16"><h2 className="text-4xl font-bold text-center">Market Insights</h2></div>; }
  function renderAIServices() { return <div className="container mx-auto px-4 py-16"><h2 className="text-4xl font-bold text-center">AI Services</h2></div>; }
  function renderBlog() { return <div className="container mx-auto px-4 py-16"><h2 className="text-4xl font-bold text-center">Blog</h2></div>; }
  function renderContact() { return <div className="container mx-auto px-4 py-16"><h2 className="text-4xl font-bold text-center">Contact</h2></div>; }
};

export default AlhambraBankApp;

