# Proje 4: E-Ticaret Uygulaması (Otomatik Ölçeklendirme ve Yönetim)

## Proje Tanımı

Bu proje kapsamında bulut ortamında çalışabilen, ölçeklenebilir bir e-ticaret platformu geliştirilmiştir. Sistem, kullanıcıların ürünleri görüntüleyebildiği, sepete ekleyebildiği ve sipariş oluşturabildiği bir yapı sunmaktadır.

Uygulama AWS bulut servisleri üzerinde çalışacak şekilde tasarlanmış ve yüksek trafik durumlarında otomatik ölçeklendirme (Auto Scaling) desteği sağlanmıştır.

---

# Amaç

Bu projenin amacı;

* Modern bir e-ticaret uygulaması geliştirmek
* Bulut bilişim servislerini kullanmak
* Yük dengeleme (Load Balancing) gerçekleştirmek
* Otomatik ölçeklendirme (Auto Scaling) uygulamak
* Güvenli veritabanı yönetimi sağlamak
* Yüksek erişilebilirlik (High Availability) elde etmektir

---

# Kullanılan Teknolojiler

## Backend

* Node.js
* Express.js

## Veritabanı

* MySQL
* Prisma ORM

## Kimlik Doğrulama

* JWT (JSON Web Token)

## Bulut Platformu

* AWS EC2
* AWS RDS MySQL
* AWS Elastic Load Balancer
* AWS Auto Scaling Group

## Test Araçları

* Apache Bench (ab)
* Postman

---

# Sistem Mimarisi

```text
                    INTERNET
                        |
                        v
            +----------------------+
            | Elastic Load Balancer|
            +----------------------+
                    /      \
                   /        \
                  v          v
        +---------------+ +---------------+
        | EC2 Instance 1| | EC2 Instance 2|
        | Node.js App   | | Node.js App   |
        +---------------+ +---------------+
                 \             /
                  \           /
                   v         v
               +---------------+
               | AWS RDS MySQL |
               +---------------+
```

---

# Uygulama Özellikleri

## Kullanıcı İşlemleri

* Kullanıcı kayıt olma
* Kullanıcı giriş yapma
* Profil görüntüleme

## Ürün İşlemleri

* Ürün listeleme
* Ürün detay görüntüleme
* Ürün arama

## Sepet İşlemleri

* Ürünü sepete ekleme
* Sepetten ürün çıkarma
* Sepeti görüntüleme

## Sipariş İşlemleri

* Sipariş oluşturma
* Sipariş geçmişini görüntüleme

## Yönetici İşlemleri

* Ürün ekleme
* Ürün güncelleme
* Ürün silme

---

# Veritabanı Tasarımı

## Users

| Alan       | Tip       |
| ---------- | --------- |
| id         | INT       |
| name       | VARCHAR   |
| email      | VARCHAR   |
| password   | VARCHAR   |
| created_at | TIMESTAMP |

## Products

| Alan        | Tip     |
| ----------- | ------- |
| id          | INT     |
| name        | VARCHAR |
| description | TEXT    |
| price       | DECIMAL |
| stock       | INT     |
| image_url   | VARCHAR |

## Cart

| Alan       | Tip |
| ---------- | --- |
| id         | INT |
| user_id    | INT |
| product_id | INT |
| quantity   | INT |

## Orders

| Alan        | Tip       |
| ----------- | --------- |
| id          | INT       |
| user_id     | INT       |
| total_price | DECIMAL   |
| order_date  | TIMESTAMP |

## Order_Items

| Alan       | Tip     |
| ---------- | ------- |
| id         | INT     |
| order_id   | INT     |
| product_id | INT     |
| quantity   | INT     |
| price      | DECIMAL |

---

# AWS Kurulumu

## 1. EC2 Oluşturma

* Ubuntu Server kurulumu
* Node.js kurulumu
* Git kurulumu
* Projenin sunucuya aktarılması

## 2. RDS MySQL Oluşturma

* MySQL veritabanı oluşturulması
* Güvenlik gruplarının yapılandırılması
* EC2 bağlantısının sağlanması

## 3. Elastic Load Balancer

* Load Balancer oluşturulması
* EC2 instance'larının eklenmesi
* Health Check yapılandırılması

## 4. Auto Scaling Group

Aşağıdaki yapılandırma kullanılacaktır:

* Minimum Instance: 2
* Desired Instance: 2
* Maximum Instance: 5

Ölçeklendirme Kuralı:

* CPU > %70 → Yeni EC2 oluştur
* CPU < %30 → Instance azalt

---

# Güvenlik Önlemleri

## JWT Authentication

Kullanıcı giriş işlemleri JWT ile korunmaktadır.

## HTTPS

SSL sertifikası kullanılarak güvenli iletişim sağlanmaktadır.

## Security Groups

Açık portlar:

* 80 (HTTP)
* 443 (HTTPS)
* 22 (SSH)

## Veritabanı Güvenliği

RDS servisi public erişime kapatılmıştır.

Yalnızca uygulama sunucularından erişim sağlanmaktadır.

---

# API Örnekleri

## Kullanıcı Kaydı

POST /api/auth/register

```json
{
  "name": "Ali Veli",
  "email": "ali@example.com",
  "password": "123456"
}
```

## Kullanıcı Girişi

POST /api/auth/login

```json
{
  "email": "ali@example.com",
  "password": "123456"
}
```

## Ürün Listeleme

GET /api/products

## Sipariş Oluşturma

POST /api/orders

---

# Performans Testi

Apache Bench kullanılarak yük testi gerçekleştirilmiştir.

Örnek test:

```bash
ab -n 10000 -c 100 http://load-balancer-url/api/products
```

Yük altında Auto Scaling mekanizmasının yeni EC2 instance'ları oluşturduğu gözlemlenmiştir.

---

# Beklenen Çıktılar

* Ölçeklenebilir e-ticaret platformu
* Yük dengeleme desteği
* Otomatik ölçeklendirme
* Güvenli veritabanı yönetimi
* Yüksek erişilebilirlik
* Bulut tabanlı uygulama yönetimi

---

# Sonuç

Bu proje ile AWS servisleri kullanılarak ölçeklenebilir ve güvenli bir e-ticaret uygulaması geliştirilmiştir. Elastic Load Balancer ve Auto Scaling Group sayesinde artan kullanıcı yüklerine karşı sistem otomatik olarak tepki verebilmekte ve hizmet sürekliliği sağlanmaktadır.
