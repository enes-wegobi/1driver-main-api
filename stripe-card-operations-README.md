# Stripe Kart İşlemleri Frontend

Bu basit HTML sayfası, Stripe ile kart işlemleri yapmanızı sağlar. Mevcut NestJS backend API'niz ile entegre çalışır.

## Özellikler

- Kart ekleme
- Kayıtlı kartları görüntüleme
- Varsayılan kart ayarlama
- Kart silme
- Ödeme işlemi yapma

## Kurulum ve Kullanım

1. `stripe-card-operations.html` dosyasını açın ve aşağıdaki değişiklikleri yapın:

   - Stripe publishable key'inizi ekleyin:
     ```javascript
     stripe = Stripe('pk_test_YourStripePublishableKey');
     ```
     Bu anahtarı Stripe hesabınızdan alabilirsiniz.

   - API URL'nizi ayarlayın (gerekirse):
     ```javascript
     const apiUrl = ''; // API URL'nizi buraya ekleyin
     ```
     Eğer HTML dosyası API ile aynı domain üzerinde çalışacaksa boş bırakabilirsiniz.

2. HTML dosyasını bir web sunucusunda barındırın veya doğrudan tarayıcıda açın.

3. Sayfayı açtıktan sonra:
   - JWT token'ınızı girin ve "Kaydet" butonuna tıklayın
   - Kart bilgilerini girin ve "Kart Ekle" butonuna tıklayın
   - "Kartları Getir" butonuna tıklayarak kayıtlı kartları görüntüleyin
   - Ödeme yapmak için tutar girin ve "Ödeme Yap" butonuna tıklayın

## Test Kartları

Stripe test ortamında aşağıdaki test kartlarını kullanabilirsiniz:

- Başarılı ödeme: 4242 4242 4242 4242
- Doğrulama gerekli: 4000 0027 6000 3184
- Reddedilen ödeme: 4000 0000 0000 0002

Tüm test kartları için:
- Son kullanma tarihi: Gelecekteki herhangi bir tarih
- CVC: Herhangi 3 rakam
- Posta kodu: Herhangi 5 rakam

## API Entegrasyonu

Bu frontend, aşağıdaki API endpoint'lerini kullanır:

- `POST /payments/payment-methods`: Yeni kart ekleme
- `GET /payments/payment-methods`: Kayıtlı kartları getirme
- `GET /payments/payment-methods/default`: Varsayılan kartı getirme
- `PATCH /payments/payment-methods/default`: Varsayılan kartı ayarlama
- `DELETE /payments/payment-methods/{paymentMethodId}`: Kart silme
- `POST /payments/payment-intent`: Ödeme işlemi başlatma

## Güvenlik Notları

- Bu basit bir test arayüzüdür, production ortamında kullanmadan önce güvenlik önlemlerini artırın.
- Stripe.js ve Elements, kart verilerinin güvenli bir şekilde işlenmesini sağlar.
- JWT token'ınızı güvenli bir şekilde saklayın ve paylaşmayın.
