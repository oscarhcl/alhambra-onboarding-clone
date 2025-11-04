/**
 * Enhanced Real-Time Market Data Integration Service
 * Alhambra Bank & Trust - IBOSS Portfolio Tracker Follow-up #1
 * 
 * This service provides comprehensive real-time market data integration with advanced analytics,
 * multiple data sources, technical indicators, and intelligent market intelligence.
 */

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');
const winston = require('winston');

class EnhancedMarketDataService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            // API Keys
            alphaVantageKey: config.alphaVantageKey || process.env.ALPHA_VANTAGE_API_KEY,
            finnhubKey: config.finnhubKey || process.env.FINNHUB_API_KEY,
            polygonKey: config.polygonKey || process.env.POLYGON_API_KEY,
            
            // Update intervals
            realTimeInterval: config.realTimeInterval || 5000, // 5 seconds
            marketDataInterval: config.marketDataInterval || 30000, // 30 seconds
            newsUpdateInterval: config.newsUpdateInterval || 300000, // 5 minutes
            
            // Cache settings
            quoteCacheTime: config.quoteCacheTime || 30000, // 30 seconds
            historicalCacheTime: config.historicalCacheTime || 3600000, // 1 hour
            
            // Connection settings
            maxRetries: config.maxRetries || 5,
            timeout: config.timeout || 10000,
            
            // Market hours
            marketOpen: config.marketOpen || '09:30',
            marketClose: config.marketClose || '16:00',
            timezone: config.timezone || 'America/New_York'
        };

        // Data storage
        this.cache = new Map();
        this.subscriptions = new Set();
        this.marketData = new Map();
        this.technicalIndicators = new Map();
        this.marketNews = [];
        this.marketSentiment = new Map();
        
        // Connection status
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.websockets = new Map();
        
        // Market status
        this.marketStatus = {
            isOpen: false,
            nextOpen: null,
            nextClose: null,
            timezone: this.config.timezone
        };

        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/enhanced-market-data.log' }),
                new winston.transports.Console()
            ]
        });

        this.initializeService();
    }

    async initializeService() {
        try {
            this.logger.info('Initializing Enhanced Market Data Service...');
            
            // Check market status
            await this.updateMarketStatus();
            
            // Initialize WebSocket connections
            await this.initializeWebSocketConnections();
            
            // Start data update cycles
            this.startRealTimeUpdates();
            this.startMarketDataUpdates();
            this.startNewsUpdates();
            
            // Initialize market intelligence
            await this.initializeMarketIntelligence();
            
            this.logger.info('Enhanced Market Data Service initialized successfully');
            this.emit('initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Enhanced Market Data Service:', error);
            this.emit('error', error);
        }
    }

    /**
     * Real-time quote with enhanced data
     */
    async getEnhancedQuote(symbol) {
        try {
            const cacheKey = `enhanced_quote_${symbol}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.config.quoteCacheTime) {
                return cached.data;
            }

            // Get basic quote
            const quote = await this.getMultiSourceQuote(symbol);
            
            // Enhance with technical indicators
            const technicals = await this.getTechnicalIndicators(symbol);
            
            // Add market sentiment
            const sentiment = await this.getMarketSentiment(symbol);
            
            // Add analyst data
            const analystData = await this.getAnalystData(symbol);
            
            // Add options data
            const optionsData = await this.getOptionsData(symbol);

            const enhancedQuote = {
                ...quote,
                technicals,
                sentiment,
                analystData,
                optionsData,
                marketStatus: this.marketStatus,
                lastUpdated: new Date().toISOString()
            };

            // Cache the enhanced quote
            this.cache.set(cacheKey, {
                data: enhancedQuote,
                timestamp: Date.now()
            });

            this.emit('enhancedQuote', { symbol, quote: enhancedQuote });
            return enhancedQuote;

        } catch (error) {
            this.logger.error(`Error fetching enhanced quote for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Multi-source quote aggregation
     */
    async getMultiSourceQuote(symbol) {
        const sources = [
            () => this.getAlphaVantageQuote(symbol),
            () => this.getFinnhubQuote(symbol),
            () => this.getPolygonQuote(symbol)
        ];

        let bestQuote = null;
        let latestTimestamp = 0;

        for (const getQuote of sources) {
            try {
                const quote = await getQuote();
                if (quote && quote.timestamp > latestTimestamp) {
                    bestQuote = quote;
                    latestTimestamp = quote.timestamp;
                }
            } catch (error) {
                this.logger.warn(`Quote source failed for ${symbol}:`, error.message);
            }
        }

        if (!bestQuote) {
            throw new Error(`No quote data available for ${symbol}`);
        }

        return bestQuote;
    }

    /**
     * Advanced technical indicators
     */
    async getTechnicalIndicators(symbol) {
        try {
            const historicalData = await this.getHistoricalData(symbol, '1y', '1d');
            if (!historicalData || historicalData.length < 50) {
                return null;
            }

            const closes = historicalData.map(d => d.close);
            const highs = historicalData.map(d => d.high);
            const lows = historicalData.map(d => d.low);
            const volumes = historicalData.map(d => d.volume);

            return {
                // Moving Averages
                sma20: this.calculateSMA(closes, 20),
                sma50: this.calculateSMA(closes, 50),
                sma200: this.calculateSMA(closes, 200),
                ema12: this.calculateEMA(closes, 12),
                ema26: this.calculateEMA(closes, 26),
                
                // Momentum Indicators
                rsi: this.calculateRSI(closes, 14),
                macd: this.calculateMACD(closes),
                stochastic: this.calculateStochastic(highs, lows, closes, 14),
                
                // Volatility Indicators
                bollingerBands: this.calculateBollingerBands(closes, 20, 2),
                atr: this.calculateATR(highs, lows, closes, 14),
                
                // Volume Indicators
                volumeSMA: this.calculateSMA(volumes, 20),
                volumeRatio: volumes[volumes.length - 1] / this.calculateSMA(volumes, 20),
                
                // Support/Resistance
                support: this.findSupportLevel(lows),
                resistance: this.findResistanceLevel(highs),
                
                // Trend Analysis
                trendDirection: this.analyzeTrend(closes),
                trendStrength: this.calculateTrendStrength(closes),
                
                // Price Patterns
                patterns: this.identifyPatterns(historicalData),
                
                // Fibonacci Levels
                fibonacciLevels: this.calculateFibonacciLevels(highs, lows),
                
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            this.logger.warn(`Technical indicators failed for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Market sentiment analysis
     */
    async getMarketSentiment(symbol) {
        try {
            // Get news sentiment
            const newsSentiment = await this.getNewsSentiment(symbol);
            
            // Get social media sentiment (simulated)
            const socialSentiment = this.getSocialMediaSentiment(symbol);
            
            // Get analyst sentiment
            const analystSentiment = await this.getAnalystSentiment(symbol);
            
            // Calculate composite sentiment
            const compositeSentiment = this.calculateCompositeSentiment([
                newsSentiment,
                socialSentiment,
                analystSentiment
            ]);

            return {
                composite: compositeSentiment,
                news: newsSentiment,
                social: socialSentiment,
                analyst: analystSentiment,
                confidence: this.calculateSentimentConfidence([newsSentiment, socialSentiment, analystSentiment]),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            this.logger.warn(`Sentiment analysis failed for ${symbol}:`, error.message);
            return {
                composite: 'neutral',
                confidence: 0,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Analyst data aggregation
     */
    async getAnalystData(symbol) {
        try {
            // This would integrate with actual analyst data providers
            // For now, we'll simulate realistic analyst data
            
            const recommendations = this.generateAnalystRecommendations();
            const priceTargets = this.generatePriceTargets();
            const earnings = await this.getEarningsData(symbol);

            return {
                recommendations,
                priceTargets,
                earnings,
                upgrades: this.getRecentUpgrades(symbol),
                downgrades: this.getRecentDowngrades(symbol),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            this.logger.warn(`Analyst data failed for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Options data
     */
    async getOptionsData(symbol) {
        try {
            // This would integrate with options data providers
            // Simulating options chain data
            
            return {
                impliedVolatility: Math.random() * 0.5 + 0.1, // 10-60%
                putCallRatio: Math.random() * 2 + 0.5, // 0.5-2.5
                maxPain: this.calculateMaxPain(symbol),
                unusualActivity: this.detectUnusualOptionsActivity(symbol),
                expirationDates: this.getOptionsExpirationDates(),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            this.logger.warn(`Options data failed for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Market intelligence and insights
     */
    async getMarketIntelligence() {
        try {
            return {
                marketOverview: await this.getMarketOverview(),
                sectorPerformance: await this.getSectorPerformance(),
                economicIndicators: await this.getEconomicIndicators(),
                marketBreadth: await this.getMarketBreadth(),
                volatilityIndex: await this.getVolatilityIndex(),
                commodities: await this.getCommoditiesData(),
                currencies: await this.getCurrenciesData(),
                bonds: await this.getBondsData(),
                crypto: await this.getCryptoData(),
                globalMarkets: await this.getGlobalMarketsData(),
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('Market intelligence failed:', error);
            throw error;
        }
    }

    /**
     * Real-time alerts and notifications
     */
    createAlert(config) {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const alert = {
            id: alertId,
            symbol: config.symbol,
            type: config.type, // 'price', 'volume', 'technical', 'news'
            condition: config.condition,
            value: config.value,
            active: true,
            created: new Date().toISOString(),
            triggered: null
        };

        this.alerts = this.alerts || new Map();
        this.alerts.set(alertId, alert);
        
        this.logger.info(`Alert created: ${alertId} for ${config.symbol}`);
        return alertId;
    }

    /**
     * Portfolio-level analytics
     */
    async analyzePortfolioMarketExposure(holdings) {
        try {
            const analysis = {
                sectorExposure: {},
                marketCapExposure: {},
                geographicExposure: {},
                correlationMatrix: {},
                betaAnalysis: {},
                riskMetrics: {},
                marketSensitivity: {}
            };

            for (const holding of holdings) {
                const quote = await this.getEnhancedQuote(holding.symbol);
                const weight = holding.marketValue / holdings.reduce((sum, h) => sum + h.marketValue, 0);
                
                // Sector exposure
                const sector = quote.sector || 'Unknown';
                analysis.sectorExposure[sector] = (analysis.sectorExposure[sector] || 0) + weight;
                
                // Beta analysis
                analysis.betaAnalysis[holding.symbol] = {
                    beta: quote.technicals?.beta || 1,
                    weight: weight,
                    contribution: (quote.technicals?.beta || 1) * weight
                };
            }

            // Calculate portfolio beta
            analysis.portfolioBeta = Object.values(analysis.betaAnalysis)
                .reduce((sum, item) => sum + item.contribution, 0);

            return analysis;
        } catch (error) {
            this.logger.error('Portfolio market exposure analysis failed:', error);
            throw error;
        }
    }

    /**
     * WebSocket connections for real-time data
     */
    async initializeWebSocketConnections() {
        try {
            // Finnhub WebSocket for real-time quotes
            if (this.config.finnhubKey) {
                const finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${this.config.finnhubKey}`);
                
                finnhubWs.on('open', () => {
                    this.logger.info('Finnhub WebSocket connected');
                    this.websockets.set('finnhub', finnhubWs);
                });
                
                finnhubWs.on('message', (data) => {
                    this.handleFinnhubMessage(JSON.parse(data));
                });
                
                finnhubWs.on('error', (error) => {
                    this.logger.error('Finnhub WebSocket error:', error);
                });
            }

            // Polygon WebSocket for real-time data
            if (this.config.polygonKey) {
                const polygonWs = new WebSocket(`wss://socket.polygon.io/stocks`);
                
                polygonWs.on('open', () => {
                    this.logger.info('Polygon WebSocket connected');
                    polygonWs.send(JSON.stringify({
                        action: 'auth',
                        params: this.config.polygonKey
                    }));
                    this.websockets.set('polygon', polygonWs);
                });
                
                polygonWs.on('message', (data) => {
                    this.handlePolygonMessage(JSON.parse(data));
                });
            }

            this.isConnected = true;
        } catch (error) {
            this.logger.error('WebSocket initialization failed:', error);
        }
    }

    /**
     * Start real-time update cycles
     */
    startRealTimeUpdates() {
        setInterval(async () => {
            if (this.subscriptions.size > 0 && this.marketStatus.isOpen) {
                for (const symbol of this.subscriptions) {
                    try {
                        const quote = await this.getEnhancedQuote(symbol);
                        this.emit('realTimeUpdate', { symbol, quote });
                    } catch (error) {
                        this.logger.warn(`Real-time update failed for ${symbol}:`, error.message);
                    }
                }
            }
        }, this.config.realTimeInterval);
    }

    startMarketDataUpdates() {
        setInterval(async () => {
            try {
                await this.updateMarketStatus();
                const intelligence = await this.getMarketIntelligence();
                this.emit('marketIntelligence', intelligence);
            } catch (error) {
                this.logger.warn('Market data update failed:', error.message);
            }
        }, this.config.marketDataInterval);
    }

    startNewsUpdates() {
        setInterval(async () => {
            try {
                const news = await this.getMarketNews();
                this.marketNews = news;
                this.emit('marketNews', news);
            } catch (error) {
                this.logger.warn('News update failed:', error.message);
            }
        }, this.config.newsUpdateInterval);
    }

    /**
     * Advanced calculation methods
     */
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        if (!ema12 || !ema26) return null;
        
        const macdLine = ema12 - ema26;
        const signalLine = this.calculateEMA([macdLine], 9);
        const histogram = macdLine - signalLine;
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    calculateStochastic(highs, lows, closes, period = 14) {
        if (closes.length < period) return null;
        
        const recentHighs = highs.slice(-period);
        const recentLows = lows.slice(-period);
        const currentClose = closes[closes.length - 1];
        
        const highestHigh = Math.max(...recentHighs);
        const lowestLow = Math.min(...recentLows);
        
        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
        
        return {
            k: k,
            d: this.calculateSMA([k], 3) // Simplified D calculation
        };
    }

    calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < period + 1) return null;
        
        const trueRanges = [];
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return this.calculateSMA(trueRanges.slice(-period), period);
    }

    identifyPatterns(historicalData) {
        // Simplified pattern recognition
        const patterns = [];
        
        if (this.isDoubleTTop(historicalData)) {
            patterns.push({ type: 'Double Top', signal: 'bearish' });
        }
        
        if (this.isDoubleBottom(historicalData)) {
            patterns.push({ type: 'Double Bottom', signal: 'bullish' });
        }
        
        if (this.isHeadAndShoulders(historicalData)) {
            patterns.push({ type: 'Head and Shoulders', signal: 'bearish' });
        }
        
        return patterns;
    }

    calculateFibonacciLevels(highs, lows) {
        const recentHigh = Math.max(...highs.slice(-50));
        const recentLow = Math.min(...lows.slice(-50));
        const range = recentHigh - recentLow;
        
        return {
            level_0: recentHigh,
            level_236: recentHigh - (range * 0.236),
            level_382: recentHigh - (range * 0.382),
            level_500: recentHigh - (range * 0.500),
            level_618: recentHigh - (range * 0.618),
            level_786: recentHigh - (range * 0.786),
            level_100: recentLow
        };
    }

    // Additional helper methods would be implemented here...
    // This provides a comprehensive framework for enhanced market data

    /**
     * Cleanup resources
     */
    destroy() {
        this.subscriptions.clear();
        this.cache.clear();
        
        // Close WebSocket connections
        for (const [name, ws] of this.websockets) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        }
        
        this.removeAllListeners();
        this.logger.info('Enhanced Market Data Service destroyed');
    }
}

module.exports = EnhancedMarketDataService;
