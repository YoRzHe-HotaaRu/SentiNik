// SentiNik - Sentiment Analysis Dashboard
class SentimentAnalyzer {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.charts = {};
        this.currentFilter = {
            game: 'all',
            sentiment: 'all',
            rating: 'all',
            search: ''
        };
        this.gameNames = [];
        this.isDataLoaded = false;
        
        this.init();
    }

    async init() {
        this.showLoading();
        try {
            await this.loadData();
            this.setupEventListeners();
            this.populateFilters();
            this.createAllCharts();
            this.updateStatistics();
            this.createDataTable();
            this.hideLoading();
            this.isDataLoaded = true;
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load data. Please check the console for details.');
        }
    }

    // Load and parse CSV data
    async loadData() {
        try {
            const response = await fetch('analyzed_reviews.csv');
            const csvText = await response.text();
            this.parseCSV(csvText);
            console.log('Loaded', this.rawData.length, 'reviews');
        } catch (error) {
            console.error('Error loading CSV:', error);
            throw error;
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const review = {};
                headers.forEach((header, index) => {
                    review[header.trim()] = values[index] ? values[index].trim() : '';
                });
                
                // Data type conversions
                review.game_id = parseInt(review.game_id);
                review.rating = parseInt(review.rating);
                review.helpful = parseInt(review.helpful) || 0;
                review.funny = parseInt(review.funny) || 0;
                review.playtime = parseInt(review.playtime) || 0;
                review.timestamp = parseInt(review.timestamp) || 0;
                review.sentiment_confidence = parseFloat(review.sentiment_confidence) || 0;
                
                // Game name mapping
                review.game_name = this.getGameName(review.game_id);
                
                this.rawData.push(review);
            }
        }
        
        this.filteredData = [...this.rawData];
        this.gameNames = [...new Set(this.rawData.map(item => item.game_name))].sort();
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    getGameName(gameId) {
        const gameMap = {
            1086940: 'Baldur\'s Gate 3',
            1091500: 'Cyberpunk 2077',
            1245620: 'Elden Ring',
            1145360: 'Hades',
            292030: 'The Witcher 3',
            1174180: 'Red Dead Redemption 2',
            1940340: 'Darkest Dungeon 2',
            2651280: 'Spider-Man 2',
            2050650: 'Resident Evil 4 Remake',
            1716740: 'Starfield'
        };
        return gameMap[gameId] || `Game ${gameId}`;
    }

    // Setup event listeners
    setupEventListeners() {
        // Filter controls
        document.getElementById('gameFilter').addEventListener('change', (e) => {
            this.currentFilter.game = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sentimentFilter').addEventListener('change', (e) => {
            this.currentFilter.sentiment = e.target.value;
            this.applyFilters();
        });

        document.getElementById('ratingFilter').addEventListener('change', (e) => {
            this.currentFilter.rating = e.target.value;
            this.applyFilters();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.currentFilter.search = e.target.value.toLowerCase();
            this.debounce(() => this.applyFilters(), 300)();
        });

        // Reset filters
        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Export data
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportData();
        });

        // Table toggle
        document.getElementById('toggleTable').addEventListener('click', () => {
            this.toggleDataTable();
        });

        // Chart tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-tab-btn')) {
                this.switchChartTab(e.target);
            }
            if (e.target.classList.contains('view-btn')) {
                this.switchView(e.target);
            }
        });

        // Modal controls
        window.closeGameModal = () => this.closeGameModal();
    }

    // Populate filter dropdowns
    populateFilters() {
        const gameFilter = document.getElementById('gameFilter');
        
        // Clear existing options except "All Games"
        while (gameFilter.children.length > 1) {
            gameFilter.removeChild(gameFilter.lastChild);
        }
        
        // Add game options
        this.gameNames.forEach(game => {
            const option = document.createElement('option');
            option.value = game;
            option.textContent = game;
            gameFilter.appendChild(option);
        });
    }

    // Apply filters to data
    applyFilters() {
        this.filteredData = this.rawData.filter(item => {
            // Game filter
            if (this.currentFilter.game !== 'all' && item.game_name !== this.currentFilter.game) {
                return false;
            }
            
            // Sentiment filter
            if (this.currentFilter.sentiment !== 'all' && item.sentiment !== this.currentFilter.sentiment) {
                return false;
            }
            
            // Rating filter
            if (this.currentFilter.rating !== 'all' && item.rating !== parseInt(this.currentFilter.rating)) {
                return false;
            }
            
            // Search filter
            if (this.currentFilter.search && !item.review_text.toLowerCase().includes(this.currentFilter.search)) {
                return false;
            }
            
            return true;
        });
        
        this.updateAllCharts();
        this.updateStatistics();
        this.updateDataTable();
    }

    // Reset all filters
    resetFilters() {
        this.currentFilter = {
            game: 'all',
            sentiment: 'all',
            rating: 'all',
            search: ''
        };
        
        document.getElementById('gameFilter').value = 'all';
        document.getElementById('sentimentFilter').value = 'all';
        document.getElementById('ratingFilter').value = 'all';
        document.getElementById('searchInput').value = '';
        
        this.applyFilters();
    }

    // Create all charts
    createAllCharts() {
        this.createSentimentDistributionChart();
        this.createGameComparisonChart();
        this.createTemporalTrendsChart();
        this.createRatingSentimentChart();
        this.createPlaytimeSentimentChart();
        this.createWordCloud();
        this.createConfidenceChart();
    }

    // Update all charts with filtered data
    updateAllCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
        this.createAllCharts();
    }

    // Chart creation methods
    createSentimentDistributionChart() {
        const ctx = document.getElementById('sentimentDistributionChart');
        if (!ctx) return;
        
        const sentimentCounts = this.getSentimentCounts();
        
        this.charts.sentimentDist = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Negative'],
                datasets: [{
                    data: [sentimentCounts.positive, sentimentCounts.negative],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderColor: ['#ffffff', '#ffffff'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = sentimentCounts.positive + sentimentCounts.negative;
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createConfidenceChart() {
        const ctx = document.getElementById('confidenceChart');
        if (!ctx) return;
        
        const confidenceData = this.getConfidenceData();
        
        this.charts.confidence = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0.0-0.2', '0.2-0.4', '0.4-0.6', '0.6-0.8', '0.8-1.0'],
                datasets: [{
                    label: 'Number of Reviews',
                    data: confidenceData,
                    backgroundColor: '#06b6d4',
                    borderColor: '#0891b2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Reviews' }
                    },
                    x: {
                        title: { display: true, text: 'Confidence Range' }
                    }
                }
            }
        });
    }

    createGameComparisonChart() {
        const ctx = document.getElementById('gameComparisonChart');
        if (!ctx) return;
        
        const gameData = this.getGameComparisonData();
        
        this.charts.gameComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: gameData.labels,
                datasets: [{
                    label: 'Positive',
                    data: gameData.positive,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }, {
                    label: 'Negative',
                    data: gameData.negative,
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: { display: true, text: 'Number of Reviews' }
                    },
                    x: {
                        stacked: true,
                        title: { display: true, text: 'Games' }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const gameName = gameData.labels[index];
                        this.showGameModal(gameName);
                    }
                }
            }
        });
    }

    createTemporalTrendsChart() {
        const ctx = document.getElementById('temporalTrendsChart');
        if (!ctx) return;
        
        const temporalData = this.getTemporalData();
        
        this.charts.temporal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: temporalData.labels,
                datasets: [{
                    label: 'Positive Sentiment %',
                    data: temporalData.positivePercent,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Negative Sentiment %',
                    data: temporalData.negativePercent,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: 'Percentage' }
                    },
                    x: {
                        title: { display: true, text: 'Time Period' }
                    }
                }
            }
        });
    }

    createRatingSentimentChart() {
        const ctx = document.getElementById('ratingSentimentChart');
        if (!ctx) return;
        
        const ratingData = this.getRatingSentimentData();
        
        this.charts.ratingSentiment = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Positive Reviews',
                    data: ratingData.positive,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    pointRadius: 4
                }, {
                    label: 'Negative Reviews',
                    data: ratingData.negative,
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: Rating ${context.parsed.x}, Confidence ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Rating (1-5)' },
                        min: 0.5,
                        max: 5.5
                    },
                    y: {
                        title: { display: true, text: 'Sentiment Confidence' },
                        min: 0,
                        max: 1
                    }
                }
            }
        });
    }

    createPlaytimeSentimentChart() {
        const ctx = document.getElementById('playtimeSentimentChart');
        if (!ctx) return;
        
        const playtimeData = this.getPlaytimeSentimentData();
        
        this.charts.playtimeSentiment = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Positive Reviews',
                    data: playtimeData.positive,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    pointRadius: 3
                }, {
                    label: 'Negative Reviews',
                    data: playtimeData.negative,
                    backgroundColor: '#ef4444',
                    borderColor: '#dc2626',
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: {
                        type: 'logarithmic',
                        title: { display: true, text: 'Playtime (seconds, log scale)' }
                    },
                    y: {
                        title: { display: true, text: 'Sentiment Confidence' },
                        min: 0,
                        max: 1
                    }
                }
            }
        });
    }

    createWordCloud() {
        const container = document.getElementById('wordCloud');
        if (!container) return;
        
        const words = this.getTopWords();
        container.innerHTML = '';
        
        words.forEach(word => {
            const wordElement = document.createElement('span');
            wordElement.className = 'word-cloud-item';
            wordElement.textContent = word.word;
            wordElement.style.fontSize = `${Math.max(0.8, word.frequency * 2)}rem`;
            wordElement.title = `Appears ${word.count} times`;
            container.appendChild(wordElement);
        });
    }

    // Data analysis methods
    getSentimentCounts() {
        const counts = { positive: 0, negative: 0 };
        this.filteredData.forEach(item => {
            if (item.sentiment === 'positive') counts.positive++;
            else if (item.sentiment === 'negative') counts.negative++;
        });
        return counts;
    }

    getConfidenceData() {
        const ranges = [0, 0, 0, 0, 0];
        this.filteredData.forEach(item => {
            const confidence = item.sentiment_confidence;
            if (confidence <= 0.2) ranges[0]++;
            else if (confidence <= 0.4) ranges[1]++;
            else if (confidence <= 0.6) ranges[2]++;
            else if (confidence <= 0.8) ranges[3]++;
            else ranges[4]++;
        });
        return ranges;
    }

    getGameComparisonData() {
        const gameStats = {};
        
        this.filteredData.forEach(item => {
            if (!gameStats[item.game_name]) {
                gameStats[item.game_name] = { positive: 0, negative: 0 };
            }
            if (item.sentiment === 'positive') gameStats[item.game_name].positive++;
            else if (item.sentiment === 'negative') gameStats[item.game_name].negative++;
        });
        
        const labels = Object.keys(gameStats).sort();
        return {
            labels,
            positive: labels.map(game => gameStats[game].positive),
            negative: labels.map(game => gameStats[game].negative)
        };
    }

    getTemporalData() {
        const monthlyData = {};
        
        this.filteredData.forEach(item => {
            const date = new Date(item.timestamp * 1000);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { positive: 0, negative: 0 };
            }
            
            if (item.sentiment === 'positive') monthlyData[monthKey].positive++;
            else if (item.sentiment === 'negative') monthlyData[monthKey].negative++;
        });
        
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            return new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
        });
        
        const positivePercent = sortedMonths.map(month => {
            const total = monthlyData[month].positive + monthlyData[month].negative;
            return total > 0 ? (monthlyData[month].positive / total) * 100 : 0;
        });
        
        const negativePercent = sortedMonths.map(month => {
            const total = monthlyData[month].positive + monthlyData[month].negative;
            return total > 0 ? (monthlyData[month].negative / total) * 100 : 0;
        });
        
        return { labels, positivePercent, negativePercent };
    }

    getRatingSentimentData() {
        const positive = [];
        const negative = [];
        
        this.filteredData.forEach(item => {
            const point = { x: item.rating, y: item.sentiment_confidence };
            if (item.sentiment === 'positive') positive.push(point);
            else if (item.sentiment === 'negative') negative.push(point);
        });
        
        return { positive, negative };
    }

    getPlaytimeSentimentData() {
        const positive = [];
        const negative = [];
        
        this.filteredData.forEach(item => {
            if (item.playtime > 0) {
                const point = { x: item.playtime, y: item.sentiment_confidence };
                if (item.sentiment === 'positive') positive.push(point);
                else if (item.sentiment === 'negative') negative.push(point);
            }
        });
        
        return { positive, negative };
    }

    getTopWords() {
        const wordCount = {};
        const stopWords = new Set(['the', 'and', 'to', 'is', 'it', 'in', 'a', 'of', 'for', 'on', 'with', 'as', 'this', 'that', 'at', 'by', 'an', 'be', 'are', 'or', 'from', 'have', 'has', 'had', 'was', 'were', 'been', 'will', 'can', 'but', 'not', 'you', 'i', 'we', 'they', 'he', 'she', 'them', 'his', 'her', 'their', 'our', 'us']);
        
        this.filteredData
            .filter(item => item.sentiment === 'positive')
            .forEach(item => {
                const text = item.cleaned_text.toLowerCase();
                const words = text.match(/\b\w+\b/g) || [];
                
                words.forEach(word => {
                    if (word.length > 2 && !stopWords.has(word) && !word.match(/^\d+$/)) {
                        wordCount[word] = (wordCount[word] || 0) + 1;
                    }
                });
            });
        
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 50)
            .map(([word, count]) => ({ word, count, frequency: count / Math.max(...Object.values(wordCount)) }));
    }

    // Update statistics in header
    updateStatistics() {
        document.getElementById('totalReviews').textContent = this.filteredData.length.toLocaleString();
        document.getElementById('totalGames').textContent = new Set(this.filteredData.map(item => item.game_name)).size;
        
        const positiveCount = this.filteredData.filter(item => item.sentiment === 'positive').length;
        const avgSentiment = this.filteredData.length > 0 ? (positiveCount / this.filteredData.length * 100).toFixed(1) : 0;
        document.getElementById('avgSentiment').textContent = `${avgSentiment}%`;
    }

    // Create data table
    createDataTable() {
        this.updateDataTable();
    }

    updateDataTable() {
        const tbody = document.getElementById('reviewsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        this.filteredData.slice(0, 100).forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.game_name}</td>
                <td>${'★'.repeat(item.rating)}${'☆'.repeat(5-item.rating)}</td>
                <td><span class="sentiment-badge sentiment-${item.sentiment}">${item.sentiment}</span></td>
                <td>${item.sentiment_confidence.toFixed(2)}</td>
                <td>${item.helpful}</td>
                <td>${this.formatPlaytime(item.playtime)}</td>
                <td title="${item.review_text}">${this.truncateText(item.review_text, 50)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Utility methods
    formatPlaytime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Modal methods
    showGameModal(gameName) {
        const modal = document.getElementById('gameModal');
        const title = document.getElementById('modalGameTitle');
        const stats = document.getElementById('modalGameStats');
        
        title.textContent = `Sentiment Analysis: ${gameName}`;
        
        const gameData = this.filteredData.filter(item => item.game_name === gameName);
        const positiveCount = gameData.filter(item => item.sentiment === 'positive').length;
        const negativeCount = gameData.filter(item => item.sentiment === 'negative').length;
        const avgRating = gameData.length > 0 ? (gameData.reduce((sum, item) => sum + item.rating, 0) / gameData.length).toFixed(1) : 0;
        const avgPlaytime = gameData.length > 0 ? this.formatPlaytime(gameData.reduce((sum, item) => sum + item.playtime, 0) / gameData.length) : '0s';
        
        stats.innerHTML = `
            <div class="stat-card">
                <h4>Total Reviews</h4>
                <p>${gameData.length}</p>
            </div>
            <div class="stat-card">
                <h4>Positive Sentiment</h4>
                <p>${positiveCount} (${((positiveCount / gameData.length) * 100).toFixed(1)}%)</p>
            </div>
            <div class="stat-card">
                <h4>Negative Sentiment</h4>
                <p>${negativeCount} (${((negativeCount / gameData.length) * 100).toFixed(1)}%)</p>
            </div>
            <div class="stat-card">
                <h4>Average Rating</h4>
                <p>${avgRating}/5 ⭐</p>
            </div>
            <div class="stat-card">
                <h4>Average Playtime</h4>
                <p>${avgPlaytime}</p>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Create modal chart
        this.createModalGameChart(gameName);
    }

    createModalGameChart(gameName) {
        const ctx = document.getElementById('modalGameChartCanvas');
        if (!ctx) return;
        
        const gameData = this.filteredData.filter(item => item.game_name === gameName);
        
        // Rating distribution
        const ratingData = [0, 0, 0, 0, 0];
        gameData.forEach(item => {
            if (item.rating >= 1 && item.rating <= 5) {
                ratingData[item.rating - 1]++;
            }
        });
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                datasets: [{
                    label: 'Number of Reviews',
                    data: ratingData,
                    backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Rating Distribution'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Reviews' }
                    },
                    x: {
                        title: { display: true, text: 'Rating' }
                    }
                }
            }
        });
    }

    closeGameModal() {
        const modal = document.getElementById('gameModal');
        modal.classList.remove('active');
    }

    // Table toggle
    toggleDataTable() {
        const container = document.getElementById('dataTableContainer');
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }

    // Export functionality
    exportData() {
        const dataToExport = this.filteredData.map(item => ({
            Game: item.game_name,
            Rating: item.rating,
            Sentiment: item.sentiment,
            Confidence: item.sentiment_confidence,
            Helpful: item.helpful,
            Funny: item.funny,
            Playtime: item.playtime,
            Review_Text: item.review_text,
            Timestamp: new Date(item.timestamp * 1000).toISOString()
        }));
        
        const csv = this.convertToCSV(dataToExport);
        this.downloadCSV(csv, 'sentiment_analysis_export.csv');
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(','))
        ].join('\n');
        
        return csvContent;
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    showError(message) {
        alert(message); // Simple error display - could be enhanced with a proper modal
    }

    // Chart switching methods
    switchChartTab(button) {
        const chartId = button.dataset.chart;
        const parentCard = button.closest('.chart-card');
        
        // Update button states
        parentCard.querySelectorAll('.chart-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Handle chart switching logic here if needed
    }

    switchView(button) {
        const view = button.dataset.view;
        const parentCard = button.closest('.chart-card');
        
        // Update button states
        parentCard.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Recreate chart with new view
        this.charts.gameComparison.destroy();
        this.createGameComparisonChart();
    }
}

// CSS for sentiment badges and additional components
const additionalCSS = `
.sentiment-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
}

.sentiment-positive {
    background-color: #dcfce7;
    color: #166534;
}

.sentiment-negative {
    background-color: #fee2e2;
    color: #991b1b;
}

.stat-card {
    background: var(--bg-primary);
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
    border: 1px solid var(--border-light);
}

.stat-card h4 {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.stat-card p {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
    margin: 0;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SentimentAnalyzer();
});