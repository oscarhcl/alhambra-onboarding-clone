/**
 * Advanced Real-Time Market Data Integration Service
 * Alhambra Bank & Trust - IBOSS Portfolio Tracker Enhancement
 * 
 * This service provides real-time market data integration with multiple data sources
 * including Alpha Vantage, Yahoo Finance, and IEX Cloud for comprehensive market coverage.
 */

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');
const winston = require('winston');

class MarketDataService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            alphaVantageKey: config.alphaVantageKey || process.env.ALPHA_VANTAGE_API_KEY,
            yahooFinanceKey: config.yahooFinanceKey || process.env.YAHOO_FINANCE_API_KEY,
            iexCloudKey: config.iexCloudKey || process.env.IEX_CLOUD_API_KEY,
            updateInterval: config.updateInterval || 30000, // 30 seconds
            retryAttempts: config.retryAttempts || 3,
            timeout: config.timeout || 10000
        };

        this.cache = new Map();
        this.subscriptions = new Set();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/market-data.log' }),
                new winston.transports.Console()
            ]
        });

        this.initializeService();
    }

    async initializeService() {
        try {
            this.logger.info('Initializing Market Data Service...');
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            // Initialize WebSocket connections for real-time data
            await this.initializeWebSocketConnections();
            
            this.logger.info('Market Data Service initialized successfully');
            this.emit('initialized');
        } catch (error) {
            this.logger.error('Failed to initialize Market Data Service:', error);
            this.emit('error', error);
        }
    }

    /**
     * Get real-time quote for a symbol
     */
    async getQuote(symbol) {
        try {
            // Check cache first
            const cached = this.cache.get(`quote_${symbol}`);
            if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
                return cached.data;
            }

            // Try multiple data sources
            let quote = await this.getQuoteFromAlphaVantage(symbol);
            if (!quote) {
                quote = await this.getQuoteFromYahooFinance(symbol);
            }
            if (!quote) {
                quote = await this.getQuoteFromIEXCloud(symbol);
            }

            if (quote) {
                // Cache the result
                this.cache.set(`quote_${symbol}`, {
                    data: quote,
                    timestamp: Date.now()
                });

                this.emit('quote', { symbol, quote });
                return quote;
            }

            throw new Error(`Unable to fetch quote for ${symbol}`);
        } catch (error) {
            this.logger.error(`Error fetching quote for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get historical data for a symbol
     */
    async getHistoricalData(symbol, period = '1y', interval = '1d') {
        try {
            const cacheKey = `historical_${symbol}_${period}_${interval}`;
            const cached = this.cache.get(cacheKey);
            
            // Cache historical data for 1 hour
            if (cached && Date.now() - cached.timestamp < 3600000) {
                return cached.data;
            }

            let data = await this.getHistoricalFromAlphaVantage(symbol, period, interval);
            if (!data) {
                data = await this.getHistoricalFromYahooFinance(symbol, period, interval);
            }

            if (data) {
                this.cache.set(cacheKey, {
                    data: data,
                    timestamp: Date.now()
                });

                return data;
            }

            throw new Error(`Unable to fetch historical data for ${symbol}`);
        } catch (error) {
            this.logger.error(`Error fetching historical data for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Get market indices data
     */
    async getMarketIndices() {
        try {
            const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'];
            const data = {};

            for (const index of indices) {
                try {
                    data[index] = await this.getQuote(index);
                } catch (error) {
                    this.logger.warn(`Failed to fetch data for ${index}:`, error.message);
                }
            }

            return data;
        } catch (error) {
            this.logger.error('Error fetching market indices:', error);
            throw error;
        }
    }

    /**
     * Get sector performance data
     */
    async getSectorPerformance() {
        try {
            const sectorETFs = {
                'Technology': 'XLK',
                'Healthcare': 'XLV',
                'Financial': 'XLF',
                'Consumer Discretionary': 'XLY',
                'Communication': 'XLC',
                'Industrial': 'XLI',
                'Consumer Staples': 'XLP',
                'Energy': 'XLE',
                'Utilities': 'XLU',
                'Real Estate': 'XLRE',
                'Materials': 'XLB'
            };

            const performance = {};
            for (const [sector, etf] of Object.entries(sectorETFs)) {
                try {
                    const quote = await this.getQuote(etf);
                    performance[sector] = {
                        symbol: etf,
                        price: quote.price,
                        change: quote.change,
                        changePercent: quote.changePercent
                    };
                } catch (error) {
                    this.logger.warn(`Failed to fetch sector data for ${sector}:`, error.message);
                }
            }

            return performance;
        } catch (error) {
            this.logger.error('Error fetching sector performance:', error);
            throw error;
        }
    }

    /**
     * Alpha Vantage API integration
     */
    async getQuoteFromAlphaVantage(symbol) {
        if (!this.config.alphaVantageKey) return null;

        try {
            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol,
                    apikey: this.config.alphaVantageKey
                },
                timeout: this.config.timeout
            });

            const data = response.data['Global Quote'];
            if (!data) return null;

            return {
                symbol: data['01. symbol'],
                price: parseFloat(data['05. price']),
                change: parseFloat(data['09. change']),
                changePercent: parseFloat(data['10. change percent'].replace('%', '')),
                volume: parseInt(data['06. volume']),
                high: parseFloat(data['03. high']),
                low: parseFloat(data['04. low']),
                open: parseFloat(data['02. open']),
                previousClose: parseFloat(data['08. previous close']),
                timestamp: new Date(data['07. latest trading day']).getTime(),
                source: 'Alpha Vantage'
            };
        } catch (error) {
            this.logger.warn(`Alpha Vantage API error for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Yahoo Finance API integration (using unofficial API)
     */
    async getQuoteFromYahooFinance(symbol) {
        try {
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
                timeout: this.config.timeout
            });

            const result = response.data.chart.result[0];
            if (!result) return null;

            const meta = result.meta;
            const quote = result.indicators.quote[0];

            return {
                symbol: meta.symbol,
                price: meta.regularMarketPrice,
                change: meta.regularMarketPrice - meta.previousClose,
                changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
                volume: meta.regularMarketVolume,
                high: meta.regularMarketDayHigh,
                low: meta.regularMarketDayLow,
                open: quote.open[quote.open.length - 1],
                previousClose: meta.previousClose,
                timestamp: Date.now(),
                source: 'Yahoo Finance'
            };
        } catch (error) {
            this.logger.warn(`Yahoo Finance API error for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * IEX Cloud API integration
     */
    async getQuoteFromIEXCloud(symbol) {
        if (!this.config.iexCloudKey) return null;

        try {
            const response = await axios.get(`https://cloud.iexapis.com/stable/stock/${symbol}/quote`, {
                params: {
                    token: this.config.iexCloudKey
                },
                timeout: this.config.timeout
            });

            const data = response.data;
            return {
                symbol: data.symbol,
                price: data.latestPrice,
                change: data.change,
                changePercent: data.changePercent * 100,
                volume: data.latestVolume,
                high: data.high,
                low: data.low,
                open: data.open,
                previousClose: data.previousClose,
                timestamp: data.latestUpdate,
                source: 'IEX Cloud'
            };
        } catch (error) {
            this.logger.warn(`IEX Cloud API error for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Get historical data from Alpha Vantage
     */
    async getHistoricalFromAlphaVantage(symbol, period, interval) {
        if (!this.config.alphaVantageKey) return null;

        try {
            const functionMap = {
                '1d': 'TIME_SERIES_DAILY',
                '1wk': 'TIME_SERIES_WEEKLY',
                '1mo': 'TIME_SERIES_MONTHLY'
            };

            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: functionMap[interval] || 'TIME_SERIES_DAILY',
                    symbol: symbol,
                    apikey: this.config.alphaVantageKey,
                    outputsize: period === '1y' ? 'compact' : 'full'
                },
                timeout: this.config.timeout
            });

            const timeSeriesKey = Object.keys(response.data).find(key => key.includes('Time Series'));
            const timeSeries = response.data[timeSeriesKey];

            if (!timeSeries) return null;

            const data = Object.entries(timeSeries).map(([date, values]) => ({
                date: new Date(date).getTime(),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseInt(values['5. volume'])
            })).reverse();

            return data;
        } catch (error) {
            this.logger.warn(`Alpha Vantage historical data error for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Get historical data from Yahoo Finance
     */
    async getHistoricalFromYahooFinance(symbol, period, interval) {
        try {
            const periodMap = {
                '1d': '1d',
                '5d': '5d',
                '1mo': '1mo',
                '3mo': '3mo',
                '6mo': '6mo',
                '1y': '1y',
                '2y': '2y',
                '5y': '5y',
                '10y': '10y',
                'max': 'max'
            };

            const intervalMap = {
                '1m': '1m',
                '2m': '2m',
                '5m': '5m',
                '15m': '15m',
                '30m': '30m',
                '60m': '60m',
                '90m': '90m',
                '1h': '1h',
                '1d': '1d',
                '5d': '5d',
                '1wk': '1wk',
                '1mo': '1mo',
                '3mo': '3mo'
            };

            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
                params: {
                    period1: Math.floor(Date.now() / 1000) - this.getPeriodInSeconds(period),
                    period2: Math.floor(Date.now() / 1000),
                    interval: intervalMap[interval] || '1d'
                },
                timeout: this.config.timeout
            });

            const result = response.data.chart.result[0];
            if (!result) return null;

            const timestamps = result.timestamp;
            const quote = result.indicators.quote[0];

            const data = timestamps.map((timestamp, index) => ({
                date: timestamp * 1000,
                open: quote.open[index],
                high: quote.high[index],
                low: quote.low[index],
                close: quote.close[index],
                volume: quote.volume[index]
            })).filter(item => item.close !== null);

            return data;
        } catch (error) {
            this.logger.warn(`Yahoo Finance historical data error for ${symbol}:`, error.message);
            return null;
        }
    }

    /**
     * Initialize WebSocket connections for real-time data
     */
    async initializeWebSocketConnections() {
        // This would typically connect to real-time data feeds
        // For demo purposes, we'll simulate real-time updates
        this.logger.info('WebSocket connections initialized (simulated)');
    }

    /**
     * Start periodic updates for subscribed symbols
     */
    startPeriodicUpdates() {
        setInterval(async () => {
            if (this.subscriptions.size > 0) {
                for (const symbol of this.subscriptions) {
                    try {
                        const quote = await this.getQuote(symbol);
                        this.emit('update', { symbol, quote });
                    } catch (error) {
                        this.logger.warn(`Failed to update ${symbol}:`, error.message);
                    }
                }
            }
        }, this.config.updateInterval);
    }

    /**
     * Subscribe to real-time updates for a symbol
     */
    subscribe(symbol) {
        this.subscriptions.add(symbol.toUpperCase());
        this.logger.info(`Subscribed to real-time updates for ${symbol}`);
    }

    /**
     * Unsubscribe from real-time updates for a symbol
     */
    unsubscribe(symbol) {
        this.subscriptions.delete(symbol.toUpperCase());
        this.logger.info(`Unsubscribed from real-time updates for ${symbol}`);
    }

    /**
     * Get period in seconds for historical data
     */
    getPeriodInSeconds(period) {
        const periodMap = {
            '1d': 86400,
            '5d': 432000,
            '1mo': 2592000,
            '3mo': 7776000,
            '6mo': 15552000,
            '1y': 31536000,
            '2y': 63072000,
            '5y': 157680000,
            '10y': 315360000
        };

        return periodMap[period] || 31536000; // Default to 1 year
    }

    /**
     * Calculate technical indicators
     */
    calculateTechnicalIndicators(historicalData) {
        if (!historicalData || historicalData.length < 20) {
            return {};
        }

        const closes = historicalData.map(d => d.close);
        
        return {
            sma20: this.calculateSMA(closes, 20),
            sma50: this.calculateSMA(closes, 50),
            sma200: this.calculateSMA(closes, 200),
            rsi: this.calculateRSI(closes, 14),
            macd: this.calculateMACD(closes),
            bollinger: this.calculateBollingerBands(closes, 20, 2)
        };
    }

    /**
     * Calculate Simple Moving Average
     */
    calculateSMA(data, period) {
        if (data.length < period) return null;
        
        const sum = data.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    /**
     * Calculate RSI
     */
    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return null;

        const changes = [];
        for (let i = 1; i < data.length; i++) {
            changes.push(data[i] - data[i - 1]);
        }

        const gains = changes.map(change => change > 0 ? change : 0);
        const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

        const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculate MACD
     */
    calculateMACD(data) {
        if (data.length < 26) return null;

        const ema12 = this.calculateEMA(data, 12);
        const ema26 = this.calculateEMA(data, 26);
        
        if (!ema12 || !ema26) return null;

        const macdLine = ema12 - ema26;
        return {
            macd: macdLine,
            signal: this.calculateEMA([macdLine], 9),
            histogram: macdLine - this.calculateEMA([macdLine], 9)
        };
    }

    /**
     * Calculate Exponential Moving Average
     */
    calculateEMA(data, period) {
        if (data.length < period) return null;

        const multiplier = 2 / (period + 1);
        let ema = data[0];

        for (let i = 1; i < data.length; i++) {
            ema = (data[i] * multiplier) + (ema * (1 - multiplier));
        }

        return ema;
    }

    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(data, period = 20, stdDev = 2) {
        if (data.length < period) return null;

        const sma = this.calculateSMA(data, period);
        const recentData = data.slice(-period);
        
        const variance = recentData.reduce((sum, value) => {
            return sum + Math.pow(value - sma, 2);
        }, 0) / period;
        
        const standardDeviation = Math.sqrt(variance);

        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    /**
     * Get comprehensive market analysis
     */
    async getMarketAnalysis(symbols) {
        try {
            const analysis = {};

            for (const symbol of symbols) {
                const quote = await this.getQuote(symbol);
                const historical = await this.getHistoricalData(symbol, '1y', '1d');
                const indicators = this.calculateTechnicalIndicators(historical);

                analysis[symbol] = {
                    quote,
                    indicators,
                    trend: this.analyzeTrend(historical),
                    volatility: this.calculateVolatility(historical),
                    support: this.findSupportLevel(historical),
                    resistance: this.findResistanceLevel(historical)
                };
            }

            return analysis;
        } catch (error) {
            this.logger.error('Error in market analysis:', error);
            throw error;
        }
    }

    /**
     * Analyze trend
     */
    analyzeTrend(historicalData) {
        if (!historicalData || historicalData.length < 10) return 'Unknown';

        const recent = historicalData.slice(-10);
        const older = historicalData.slice(-20, -10);

        const recentAvg = recent.reduce((sum, d) => sum + d.close, 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d.close, 0) / older.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (change > 2) return 'Strong Uptrend';
        if (change > 0.5) return 'Uptrend';
        if (change < -2) return 'Strong Downtrend';
        if (change < -0.5) return 'Downtrend';
        return 'Sideways';
    }

    /**
     * Calculate volatility
     */
    calculateVolatility(historicalData) {
        if (!historicalData || historicalData.length < 20) return 0;

        const returns = [];
        for (let i = 1; i < historicalData.length; i++) {
            const dailyReturn = (historicalData[i].close - historicalData[i - 1].close) / historicalData[i - 1].close;
            returns.push(dailyReturn);
        }

        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        
        return Math.sqrt(variance * 252) * 100; // Annualized volatility as percentage
    }

    /**
     * Find support level
     */
    findSupportLevel(historicalData) {
        if (!historicalData || historicalData.length < 20) return null;

        const lows = historicalData.slice(-50).map(d => d.low).sort((a, b) => a - b);
        return lows[Math.floor(lows.length * 0.1)]; // 10th percentile
    }

    /**
     * Find resistance level
     */
    findResistanceLevel(historicalData) {
        if (!historicalData || historicalData.length < 20) return null;

        const highs = historicalData.slice(-50).map(d => d.high).sort((a, b) => b - a);
        return highs[Math.floor(highs.length * 0.1)]; // 90th percentile
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.subscriptions.clear();
        this.cache.clear();
        this.removeAllListeners();
        this.logger.info('Market Data Service destroyed');
    }
}

module.exports = MarketDataService;
