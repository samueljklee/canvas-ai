#!/usr/bin/env python3
import http.server
import socketserver
import json
import urllib.request
import urllib.parse
from datetime import datetime
import ssl

PORT = 8765

class StockHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/stock/'):
            # Extract stock symbol from path
            symbol = self.path.split('/stock/')[1].upper()
            
            try:
                # Using Yahoo Finance API alternative - financialmodelingprep (free tier)
                # For demo, we'll use yfinance data through a simple scraping approach
                
                # Try using free API from finnhub.io or twelvedata
                # For this demo, I'll use a Yahoo Finance scraper approach
                url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1m&range=1d'
                
                # Create SSL context that doesn't verify certificates (for demo purposes)
                context = ssl._create_unverified_context()
                
                req = urllib.request.Request(
                    url,
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                
                with urllib.request.urlopen(req, context=context) as response:
                    data = json.loads(response.read().decode())
                    
                    if 'chart' in data and 'result' in data['chart'] and data['chart']['result']:
                        result = data['chart']['result'][0]
                        meta = result['meta']
                        quote = result['indicators']['quote'][0]
                        
                        # Get the latest values
                        timestamps = result['timestamp']
                        closes = quote['close']
                        volumes = quote['volume']
                        
                        # Filter out None values and get the last valid data
                        valid_data = [(t, c, v) for t, c, v in zip(timestamps, closes, volumes) if c is not None]
                        
                        if valid_data:
                            last_timestamp, last_close, last_volume = valid_data[-1]
                        else:
                            last_close = meta['regularMarketPrice']
                            last_volume = meta.get('regularMarketVolume', 0)
                        
                        previous_close = meta['chartPreviousClose']
                        change = last_close - previous_close
                        change_percent = (change / previous_close) * 100
                        
                        stock_data = {
                            'symbol': symbol,
                            'price': round(last_close, 2),
                            'change': round(change, 2),
                            'changePercent': round(change_percent, 2),
                            'open': round(meta.get('regularMarketOpen', last_close), 2),
                            'high': round(meta['regularMarketDayHigh'], 2),
                            'low': round(meta['regularMarketDayLow'], 2),
                            'previousClose': round(previous_close, 2),
                            'volume': last_volume if last_volume else meta.get('regularMarketVolume', 0),
                            'timestamp': datetime.now().isoformat(),
                            'marketState': meta.get('marketState', 'REGULAR')
                        }
                        
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps(stock_data).encode())
                    else:
                        raise Exception("Invalid data format")
                        
            except Exception as e:
                error_data = {
                    'error': str(e),
                    'symbol': symbol,
                    'message': f'Failed to fetch data for {symbol}'
                }
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_data).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Custom logging
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), StockHandler) as httpd:
        print(f"Stock API Server running on port {PORT}")
        print(f"Access stocks at: http://localhost:{PORT}/stock/SYMBOL")
        print("Examples: /stock/MSFT, /stock/AAPL, /stock/GOOGL")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
