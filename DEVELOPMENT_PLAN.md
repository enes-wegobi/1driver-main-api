# Ride Sharing Uygulama Geliştirme Planı

## Mimari Diyagramlar

### 1. Sürücü Konum Takibi Akışı

```mermaid
sequenceDiagram
    participant Driver App
    participant WebSocket Gateway
    participant Redis
    
    Driver App->>WebSocket Gateway: Connect with authentication
    Note over WebSocket Gateway: Validate driver JWT
    WebSocket Gateway->>Redis: Mark driver as active
    
    loop Every few seconds
        Driver App->>WebSocket Gateway: updateLocation event
        WebSocket Gateway->>Redis: Store in location:user:{id}
        WebSocket Gateway->>Redis: Update in location:driver:geo
    end
    
    Driver App->>WebSocket Gateway: Disconnect
    WebSocket Gateway->>Redis: Mark driver as inactive
```

### 2. Yakındaki Sürücüleri Bulma Akışı

```mermaid
sequenceDiagram
    participant Customer App
    participant Trip Controller
    participant WebSocket Gateway
    participant Redis Service
    
    Customer App->>Trip Controller: GET /trips/nearby-drivers?lat=X&lng=Y
    Trip Controller->>Redis Service: findNearbyUsers('driver', lat, lng, radius)
    Redis Service->>Trip Controller: Return active drivers
    Trip Controller->>Customer App: Driver list with locations
    
    Customer App->>WebSocket Gateway: Subscribe to nearbyDriverUpdates
    
    loop While on trip creation page
        WebSocket Gateway->>Customer App: Send driver location updates
    end
```

### 3. Trip İsteği Bildirimi Akışı

```mermaid
flowchart TD
    A[Customer creates trip] --> B[Trip Service]
    B --> C{Find nearby drivers}
    C -->|No drivers| D[Notify customer]
    C -->|Drivers available| E[Send FCM notifications]
    E --> F[Store trip request in DB]
    F --> G[Wait for driver acceptance]
    G -->|Timeout| H[Notify next driver or cancel]
    G -->|Accepted| I[Start trip]
```

### 4. Konum Paylaşımı Akışı

```mermaid
sequenceDiagram
    participant Customer
    participant Driver
    participant WebSocket Gateway
    participant Redis
    
    Note over Customer, Driver: Trip accepted and started
    
    WebSocket Gateway->>WebSocket Gateway: Create trip room "trip:{tripId}"
    WebSocket Gateway->>Customer: Join trip room
    WebSocket Gateway->>Driver: Join trip room
    
    loop During active trip
        Customer->>WebSocket Gateway: updateLocation event
        WebSocket Gateway->>Driver: customerLocation event
        
        Driver->>WebSocket Gateway: updateLocation event
        WebSocket Gateway->>Customer: driverLocation event
        
        WebSocket Gateway->>Redis: Store both locations
    end
```

### 5. Trip Durum Değişiklikleri

```mermaid
stateDiagram-v2
    [*] --> REQUESTED
    REQUESTED --> ACCEPTED: Driver accepts
    REQUESTED --> CANCELLED: Timeout/Customer cancels
    ACCEPTED --> DRIVER_ARRIVED: Driver at pickup
    DRIVER_ARRIVED --> TRIP_STARTED: Trip begins
    TRIP_STARTED --> TRIP_COMPLETED: Arrive at destination
    TRIP_COMPLETED --> [*]
    
    ACCEPTED --> CANCELLED: Customer/Driver cancels
    DRIVER_ARRIVED --> CANCELLED: Customer/Driver cancels
    TRIP_STARTED --> CANCELLED: Emergency/Issue
```

## 1. Aktif Sürücü Konum Takibi 🚗
- [x] Sürücü konum bilgilerini Redis'e kaydetme
- [x] Sürücü aktiflik durumu için Redis yapısı
- [x] WebSocket ile konum güncellemelerini alma
- [x] Sürücü müsaitlik durumu kontrolü

## 2. Yakındaki Sürücüleri Gösterme 🗺️
- [x] Trip oluşturma ekranında müşteriye yakın sürücüleri listeleme
- [x] Redis Geo fonksiyonları ile yakındaki sürücüleri bulma
- [x] Harita üzerinde sürücüleri gösterme
- [x] Gerçek zamanlı konum güncellemesi

## 3. FCM ile Trip İsteklerini İletme 📱
- [x] Firebase/FCM modülü oluşturma
- [x] FCM token yönetimi
- [x] Yakındaki sürücülere bildirim gönderme
- [x] Trip isteği oluşturma ve izleme

## 4. Konum Bilgisi Paylaşımı ↔️
- [x] Trip odası (room) oluşturma
- [x] Sürücü-müşteri arasında konum güncellemesi paylaşımı
- [x] Gerçek zamanlı konum takibi
- [x] WebSocket bağlantı yönetimi

## 5. Trip Durum Güncellemeleri 🔄
- [x] Trip durum enum'ları oluşturma
- [x] FCM ile durum değişikliklerini bildirme
- [x] Sürücü durum değişiklikleri (yola çıktı, varış noktasında, vb.)
- [x] Müşteri bilgilendirme bildirimleri

## Teknik Detaylar

### Aktif Sürücü Konum Takibi
- Redis'te `driver:active:{driverId}` anahtarı ile aktif sürücüleri izleme
- Konum bilgilerini `location:user:{userId}` ve `location:driver:geo` setlerinde saklama
- Sürücü uygulamasından düzenli konum güncellemeleri alma (WebSocket)
- Sürücü durumunu (müsait, meşgul, çevrimdışı) takip etme

### Yakındaki Sürücüleri Gösterme
- Redis GEORADIUS komutu ile belirli bir yarıçaptaki sürücüleri bulma
- Trip oluşturma sayfasında harita entegrasyonu
- WebSocket üzerinden gerçek zamanlı konum güncellemeleri
- Müsait sürücüleri filtreleme

### FCM ile Trip İsteklerini İletme
- Firebase Admin SDK entegrasyonu
- Sürücü ve müşteri FCM token yönetimi
- Trip isteği bildirimleri için FCM yapılandırması
- Bildirim tıklama işlemleri ve yönlendirme

### Konum Bilgisi Paylaşımı
- Trip eşleşmesi sonrası özel WebSocket odası oluşturma
- Konum güncellemelerini karşılıklı paylaşma
- Harita üzerinde gerçek zamanlı takip
- Bağlantı kopması durumunda yeniden bağlanma stratejisi

### Trip Durum Güncellemeleri
- Trip durumları: REQUESTED, ACCEPTED, DRIVER_ARRIVED, TRIP_STARTED, TRIP_COMPLETED, CANCELLED
- Her durum değişikliğinde FCM bildirimleri
- Durum değişikliklerini veritabanında kaydetme
- Müşteri ve sürücü arayüzlerinde durum gösterimi
