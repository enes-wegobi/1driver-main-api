# Test Kılavuzu: Sürücü Konum Takibi ve Yakındaki Sürücüleri Bulma

Bu kılavuz, şu ana kadar geliştirilen özellikleri test etmek için adım adım talimatları içerir.

## Ön Koşullar

- Node.js ve npm yüklü olmalı
- Redis sunucusu çalışıyor olmalı
- Postman veya benzer bir API test aracı

## 1. Uygulamayı Başlatma

```bash
# Bağımlılıkları yükleyin (eğer daha önce yapmadıysanız)
npm install

# Uygulamayı geliştirme modunda başlatın
npm run start:dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

## 2. WebSocket Bağlantısını Test Etme

### HTML Test Sayfası

Aşağıdaki HTML dosyasını kullanarak WebSocket bağlantısını test edebilirsiniz. Bu dosyayı `websocket-driver-test.html` olarak kaydedin ve bir tarayıcıda açın:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Driver WebSocket Test</title>
    <script src="https://cdn.socket.io/4.4.1/socket.io.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { border: 1px solid #ccc; border-radius: 5px; padding: 15px; margin-bottom: 15px; }
        .form-group { margin-bottom: 10px; }
        label { display: block; margin-bottom: 5px; }
        input, select, button { padding: 8px; width: 100%; box-sizing: border-box; }
        button { background-color: #4CAF50; color: white; border: none; cursor: pointer; }
        button:hover { background-color: #45a049; }
        #log { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background-color: #f9f9f9; }
        .log-entry { margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Sürücü WebSocket Test Sayfası</h1>
        
        <div class="card">
            <h2>Bağlantı</h2>
            <div class="form-group">
                <label for="token">JWT Token:</label>
                <input type="text" id="token" placeholder="JWT token girin">
            </div>
            <div class="form-group">
                <button id="connect">Bağlan</button>
                <button id="disconnect" disabled>Bağlantıyı Kes</button>
            </div>
        </div>
        
        <div class="card">
            <h2>Konum Güncelleme</h2>
            <div class="form-group">
                <label for="latitude">Enlem:</label>
                <input type="number" id="latitude" placeholder="Örn: 41.0082" step="0.0001" value="41.0082">
            </div>
            <div class="form-group">
                <label for="longitude">Boylam:</label>
                <input type="number" id="longitude" placeholder="Örn: 28.9784" step="0.0001" value="28.9784">
            </div>
            <div class="form-group">
                <label for="status">Müsaitlik Durumu:</label>
                <select id="status">
                    <option value="available">Müsait</option>
                    <option value="busy">Meşgul</option>
                    <option value="offline">Çevrimdışı</option>
                </select>
            </div>
            <div class="form-group">
                <button id="updateLocation" disabled>Konum Güncelle</button>
                <button id="updateStatus" disabled>Durum Güncelle</button>
            </div>
        </div>
        
        <div class="card">
            <h2>Log</h2>
            <div id="log"></div>
        </div>
    </div>

    <script>
        let socket;
        
        function addLogEntry(message, type = 'info') {
            const log = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
        
        document.getElementById('connect').addEventListener('click', () => {
            const token = document.getElementById('token').value;
            if (!token) {
                addLogEntry('Token gerekli!', 'error');
                return;
            }
            
            try {
                socket = io('http://localhost:3000', {
                    transports: ['websocket'],
                    auth: { token }
                });
                
                socket.on('connect', () => {
                    addLogEntry('WebSocket bağlantısı kuruldu!', 'success');
                    document.getElementById('connect').disabled = true;
                    document.getElementById('disconnect').disabled = false;
                    document.getElementById('updateLocation').disabled = false;
                    document.getElementById('updateStatus').disabled = false;
                });
                
                socket.on('connection', (data) => {
                    addLogEntry(`Bağlantı başarılı: ${JSON.stringify(data)}`, 'success');
                });
                
                socket.on('disconnect', () => {
                    addLogEntry('WebSocket bağlantısı kesildi', 'info');
                    document.getElementById('connect').disabled = false;
                    document.getElementById('disconnect').disabled = true;
                    document.getElementById('updateLocation').disabled = true;
                    document.getElementById('updateStatus').disabled = true;
                });
                
                socket.on('error', (error) => {
                    addLogEntry(`Hata: ${JSON.stringify(error)}`, 'error');
                });
                
                socket.on('availabilityUpdated', (data) => {
                    addLogEntry(`Müsaitlik durumu güncellendi: ${JSON.stringify(data)}`, 'success');
                });
                
            } catch (error) {
                addLogEntry(`Bağlantı hatası: ${error.message}`, 'error');
            }
        });
        
        document.getElementById('disconnect').addEventListener('click', () => {
            if (socket) {
                socket.disconnect();
                document.getElementById('connect').disabled = false;
                document.getElementById('disconnect').disabled = true;
                document.getElementById('updateLocation').disabled = true;
                document.getElementById('updateStatus').disabled = true;
                addLogEntry('Bağlantı manuel olarak kesildi', 'info');
            }
        });
        
        document.getElementById('updateLocation').addEventListener('click', () => {
            if (!socket || !socket.connected) {
                addLogEntry('WebSocket bağlantısı yok!', 'error');
                return;
            }
            
            const latitude = parseFloat(document.getElementById('latitude').value);
            const longitude = parseFloat(document.getElementById('longitude').value);
            const status = document.getElementById('status').value;
            
            const locationData = {
                latitude,
                longitude,
                availabilityStatus: status,
                timestamp: new Date().toISOString()
            };
            
            socket.emit('updateDriverLocation', locationData, (response) => {
                if (response && response.success) {
                    addLogEntry(`Konum güncellendi: ${JSON.stringify(locationData)}`, 'success');
                } else {
                    addLogEntry(`Konum güncelleme hatası: ${JSON.stringify(response)}`, 'error');
                }
            });
        });
        
        document.getElementById('updateStatus').addEventListener('click', () => {
            if (!socket || !socket.connected) {
                addLogEntry('WebSocket bağlantısı yok!', 'error');
                return;
            }
            
            const status = document.getElementById('status').value;
            
            socket.emit('updateDriverAvailability', { status }, (response) => {
                if (response && response.success) {
                    addLogEntry(`Durum güncellendi: ${status}`, 'success');
                } else {
                    addLogEntry(`Durum güncelleme hatası: ${JSON.stringify(response)}`, 'error');
                }
            });
        });
    </script>
</body>
</html>
```

### Test Adımları

1. Uygulamayı başlatın
2. `websocket-driver-test.html` dosyasını bir tarayıcıda açın
3. Geçerli bir JWT token girin (driver tipinde bir kullanıcı için)
4. "Bağlan" butonuna tıklayın
5. Bağlantı başarılı olduktan sonra konum ve durum bilgilerini güncelleyin

## 3. API Endpoint'lerini Test Etme

### Aktif Sürücüleri Listeleme

```
GET http://localhost:3000/websocket/drivers/active
```

Bu endpoint, tüm aktif sürücüleri ve konumlarını döndürür.

### Yakındaki Sürücüleri Bulma

```
GET http://localhost:3000/websocket/location/nearby?latitude=41.0082&longitude=28.9784&radius=5&userType=driver
```

Bu endpoint, belirtilen konuma yakın sürücüleri döndürür.

### Yakındaki Müsait Sürücüleri Bulma

```
GET http://localhost:3000/websocket/location/nearby-drivers?latitude=41.0082&longitude=28.9784&radius=5
```

Bu endpoint, belirtilen konuma yakın ve müsait durumda olan sürücüleri döndürür.

### Sürücü Müsaitlik Durumunu Güncelleme

```
PUT http://localhost:3000/websocket/drivers/{driverId}/availability
```

Body:
```json
{
  "status": "available"
}
```

Bu endpoint, belirtilen sürücünün müsaitlik durumunu günceller.

## 4. Postman Koleksiyonu

Aşağıdaki Postman koleksiyonunu içe aktararak API'leri test edebilirsiniz:

```json
{
  "info": {
    "name": "Driver Location API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Active Drivers",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/websocket/drivers/active",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["websocket", "drivers", "active"]
        }
      }
    },
    {
      "name": "Get Nearby Users",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/websocket/location/nearby?latitude=41.0082&longitude=28.9784&radius=5&userType=driver",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["websocket", "location", "nearby"],
          "query": [
            {
              "key": "latitude",
              "value": "41.0082"
            },
            {
              "key": "longitude",
              "value": "28.9784"
            },
            {
              "key": "radius",
              "value": "5"
            },
            {
              "key": "userType",
              "value": "driver"
            }
          ]
        }
      }
    },
    {
      "name": "Get Nearby Available Drivers",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:3000/websocket/location/nearby-drivers?latitude=41.0082&longitude=28.9784&radius=5",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["websocket", "location", "nearby-drivers"],
          "query": [
            {
              "key": "latitude",
              "value": "41.0082"
            },
            {
              "key": "longitude",
              "value": "28.9784"
            },
            {
              "key": "radius",
              "value": "5"
            }
          ]
        }
      }
    },
    {
      "name": "Update Driver Availability",
      "request": {
        "method": "PUT",
        "url": {
          "raw": "http://localhost:3000/websocket/drivers/{{driverId}}/availability",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["websocket", "drivers", "{{driverId}}", "availability"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"status\": \"available\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        }
      }
    }
  ]
}
```

## 5. JWT Token Oluşturma

Test için geçerli bir JWT token'a ihtiyacınız olacak. Aşağıdaki endpoint'i kullanarak bir token alabilirsiniz (eğer auth servisi kuruluysa):

```
POST http://localhost:3000/auth/driver/signin
```

Body:
```json
{
  "email": "driver@example.com",
  "password": "password123"
}
```

Veya test için doğrudan JWT servisini kullanarak bir token oluşturabilirsiniz:

```javascript
// src/jwt/jwt.service.ts dosyasına test metodu ekleyin
async generateTestToken(userId: string, userType: 'driver' | 'customer') {
  return this.jwtService.sign({ userId, userType });
}
```

Ardından bu metodu bir test endpoint'i üzerinden çağırabilirsiniz.

## 6. Test Senaryoları

### Senaryo 1: Sürücü Bağlantısı ve Konum Güncellemesi

1. Sürücü WebSocket'e bağlanır
2. Sürücü konumunu günceller
3. Sürücü müsaitlik durumunu "available" olarak ayarlar
4. API üzerinden aktif sürücüleri listeleyin ve sürücünün listede olduğunu doğrulayın

### Senaryo 2: Yakındaki Sürücüleri Bulma

1. Birden fazla sürücü bağlayın ve farklı konumlar ayarlayın
2. Belirli bir konuma yakın sürücüleri sorgulayın
3. Sonuçların doğru sürücüleri içerdiğini ve mesafelerin doğru hesaplandığını doğrulayın

### Senaryo 3: Müsaitlik Durumu Filtreleme

1. Bazı sürücüleri "available", bazılarını "busy" olarak ayarlayın
2. Yakındaki müsait sürücüleri sorgulayın
3. Sonuçların sadece "available" durumundaki sürücüleri içerdiğini doğrulayın
