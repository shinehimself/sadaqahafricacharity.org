import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Google Gen AI client with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ar: 'Arabic (العربية)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  tr: 'Turkish (Türkçe)',
  ms: 'Bahasa Melayu / Indonesian',
  ur: 'Urdu (اردو)',
  sw: 'Kiswahili',
  es: 'Spanish (Español)',
  bn: 'Bengali (বাংলা)',
};

const SYSTEM_INSTRUCTION = `You are "Amanah", the official international AI Guide & Field Assistant for Sadaqah Africa Charity Organization.
Your purpose is to warmly, respectfully, and accurately assist global donors, humanitarian partners, volunteers, and aid applicants in their native language.

ORGANIZATION PROFILE & CORE FACTS:
- Organization: Sadaqah Africa Charity Organization
- Official Registration: NGO Bureau Uganda Registration #80020003418921 (Registered under the Non-Governmental Organisations Act of Uganda).
- Mission: Transparent, 100% field-verified humanitarian relief and community empowerment across East Africa (Uganda, Kenya, Tanzania, South Sudan, Rwanda, Somalia).
- Transparency & Amanah: 85% of funds go directly into ground programs, 10% for logistics/monitoring, 5% for emergency reserves.

THE $10 CAMPAIGN TO $50,000:
- Core concept: Small, accessible $10 Sadaqah shares uniting global donors to reach a landmark $50,000 Community Empowerment Fund.
- 5 Milestones:
  1. $10,000 (Phase 1): 10 Clean Water Hand Pumps & 400 Family Food Parcels
  2. $20,000 (Phase 2): Pediatric Sickle Cell Crisis Clinic & 600 Girls Dignity Kits
  3. $30,000 (Phase 3): Orphan Education Center & Madrasa Classrooms
  4. $40,000 (Phase 4): Solar Mobile Clinic Van & 120 Cataract Surgeries
  5. $50,000 (Phase 5): Permanent Sustainable Agro-Farm & Community Bread Bakery

THE 9 CORE RELIEF PROGRAMS ($10 per share):
1. Emergency Food Parcels ($10 = 25kg maize flour, beans, cooking oil for a family)
2. Clean Water Boreholes ($10 = 1,200L clean drinking water delivered)
3. Sickle Cell Pediatric Crisis ($10 = 1 month hydroxyurea + folic acid for a child)
4. Girls Dignity Kits ($10 = 2 washable reusable sanitary pad kits for school attendance)
5. Orphan Education & Uniforms ($10 = school bag, exercise books, pencils & geometry set)
6. Village Madrasa & Masjid Support ($10 = 1 Quran copy & prayer rug for rural students)
7. Widow & Maternal Micro-Agri ($10 = 5kg certified groundnut/bean seed stock)
8. Cataract Sight-Restoring Surgery ($10 = post-op medicated drops & ocular protection)
9. Rapid Emergency Medical Transport ($10 = 1 urgent ambulance transfer from remote village)

FIXED-PRICE COMMUNITY PROJECTS:
- Community Hand-Pump Well: $950 / €880 / £750
- Deep Solar-Powered Borehole: $2,400 / €2,200 / £1,890
- Rural Village Masjid: $6,500 / €6,000 / £5,150
- Complete Cow Qurban/Aqeeqah: $320 / €295 / £250
- Goat or Sheep Qurban: $75 / €70 / £60

MAJOR INFRASTRUCTURE PROJECTS:
- School Construction: $20,000 to $70,000
  * 3-Classroom Starter Block: $20,000
  * 6-Classroom Primary Block + Staffroom: $45,000
  * Complete 8-Classroom Primary Academy + Solar Well + Latrines: $70,000
- Hospital & Clinic Construction: $43,000 to $150,000
  * Rural Maternal Outpatient Clinic: $43,000
  * Community General Health Center with Ward: $85,000
  * Regional Emergency Hospital Block with Surgical Theater & Pediatric Center: $150,000

17 VERIFIED GROUND FOOTAGE PHOTOGRAPHS:
- Features 17 authentic field photographs from Kayunga, Mukono, Iganga, and Bugiri.
- Includes borehole water flow, classroom bricklaying, schoolgirls with reusable pad kits, mother and child with food relief sack, and orphan meal distribution.
- Can be viewed in the dual-lane motion slider with inspection lightbox at #field-footage.

PAYMENT RAILS:
- Mobile Money:
  * MTN Mobile Money: USSD *165*3# with Merchant Code 591024 (SADAQAH AFRICA)
  * Airtel Money: USSD *185*9# with Paybill 121400
- Cards: Visa, Mastercard, American Express via secure Stripe/Flutterwave gateway
- PayPal Express
- Bank Wire / SWIFT
- Crypto: USDT TRC-20, Bitcoin, Ethereum

CONSTITUTION & AUDITED REPORTS:
- Full legal constitution and certified financial reports available in the Constitution section (#constitution).
- Users can download the official Constitution and Audited Reports directly as a signed PDF.

AID REQUEST PORTAL:
- Community leaders, vulnerable mothers, and local medical clinics can submit verified emergency relief requests at #request-aid.

INTERNATIONAL MULTILINGUAL CAPABILITY:
You fluently support donors across the world in their native language:
- English (Global)
- Arabic (العربية - GCC, Middle East, North Africa)
- French (Français - France, Belgium, Canada, Francophone West Africa)
- German (Deutsch - Germany, Austria, Switzerland)
- Turkish (Türkçe - Turkey and Turkish diaspora)
- Bahasa Melayu / Indonesian (Malaysia, Indonesia, Singapore, Brunei)
- Urdu (اردو - Pakistan and international South Asian diaspora)
- Kiswahili (East Africa - Uganda, Kenya, Tanzania, Rwanda)
- Spanish (Español - Spain, Americas)
- Bengali (বাংলা - Bangladesh and international diaspora)

INTERACTIVE ACTION TAGS:
Whenever appropriate, embed one or two action tags translated to the target language:
- [ACTION:NAVIGATE:#section-id|Translated Button Label]
  Valid section ids: #campaign, #milestones, #programs, #fixed-projects, #live-dispatches, #field-footage, #infrastructure, #donate, #growth, #constitution, #request-aid, #faq
- [ACTION:DONATE:amount:Cause Name|Translated Button Label]

TONE & STYLE:
- Warm, compassionate, Islamic-humanitarian phrasing (e.g., "Barakallahu feek", "Jazakallahu Khairan", "May your charity bring eternal reward").
- Clear, structured answers with bullet points and bold highlights.
- Keep responses concise (2-4 short paragraphs maximum).`;

// Multilingual intelligent fallback engine supporting 10 world languages
function getMultilingualFallback(
  userMessage: string,
  lang: string = 'en'
): { reply: string; actions: Array<{ type: string; payload: string; label: string }> } {
  const query = userMessage.toLowerCase();
  const normalizedLang = lang.toLowerCase().slice(0, 2);

  // ARABIC (العربية)
  if (normalizedLang === 'ar') {
    if (query.includes('مدرس') || query.includes('مستشف') || query.includes('بناء') || query.includes('school') || query.includes('hospital') || query.includes('construct')) {
      return {
        reply: `**مشاريع البناء التنموية الكبرى (20,000$ – 150,000$)**\n\nتقوم منظمة صدقة أفريقيا بتنفيذ مشاريع إنشائية موثقة هندسياً في المناطق الريفية الأكثر احتياجاً:\n\n• **بناء المدارس الابتدائية (20,000$ – 70,000$)**:\n  - مبنى تمهيدي من 3 فصول دراسية: **20,000$**\n  - مجمع تعليمي من 6 فصول + إدارة: **45,000$**\n  - أكاديمية نموذجية متكاملة من 8 فصول + بئر طاقة شمسية: **70,000$**\n\n• **المستشفيات والمراكز الصحية (43,000$ – 150,000$)**:\n  - عيادة أمومة ورعاية أولية ريفية: **43,000$**\n  - مركز صحي عام مع عنبر إقامة: **85,000$**\n  - مستشفى طوارئ إقليمي مع غرفة عمليات ومركز فقر الدم المنجلي: **150,000$**\n\nتخضع كافة مراحل البناء لإشراف مهندسين معتمدين مع تقارير تصويرية أسبوعية.`,
        actions: [
          { type: 'NAVIGATE', payload: '#infrastructure', label: 'استعراض المدارس والمستشفيات' },
          { type: 'DONATE', payload: '20000:Community School Construction ($20,000 Starter Block)', label: 'رعاية مدرسة (20,000$)' },
          { type: 'DONATE', payload: '43000:Hospital & Clinic Construction ($43,000 Maternity Clinic)', label: 'رعاية عيادة أمومة (43,000$)' },
        ],
      };
    }
    if (query.includes('دفع') || query.includes('تبرع') || query.includes('هاتف') || query.includes('بطاق') || query.includes('pay') || query.includes('mtn') || query.includes('airtel')) {
      return {
        reply: `**طرق التبرع المعتمدة وحسابات الدفع**\n\nيمكنك المساهمة مباشرة وبكل أمان عبر وسائل الدفع العالمية والمحلية:\n\n• **الهاتف المحمول الإفريقي (Mobile Money)**:\n  - شبكة MTN: اطلب \`*165*3#\`، رمز التاجر: **591024** (SADAQAH AFRICA)\n  - شبكة Airtel: اطلب \`*185*9#\`، رمز الفاتورة: **121400**\n• **البطاقات الائتمانية والبنكية**: Visa وMastercard وAmex عبر بوابات مشفرة فورية مع إيصال رسمي فوري.\n• **PayPal والتحويل البنكي الدولي والعملات الرقمية المشفرة (USDT)**.`,
        actions: [
          { type: 'NAVIGATE', payload: '#donate', label: 'الانتقال لبوابة التبرع' },
          { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'التبرع بسهم 10$' },
        ],
      };
    }
    if (query.includes('صور') || query.includes('ميدان') || query.includes('توثيق') || query.includes('photo')) {
      return {
        reply: `**17 صورة ميدانية موثقة من أرض الواقع**\n\nنلتزم بمبدأ الأمانة والشفافية بنسبة 100%. يمكنك معاينة جميع الصور الـ 17 في معرض الحركة المباشر:\n\n• آبار مياه نقية متدفقة وأطفال يشربون الماء العذب\n• مراحل بناء جدران الفصول الدراسية وتثبيت الخرسانة\n• توزيع الحقائب الصحية المدرسية القابلة لإعادة الغسيل للفتيات\n• تسليم طرود الغذاء الطارئة للأمهات والأيتام\n\nكل صورة مرفقة بإحداثيات GPS ونسب الإنجاز وزر لدعم المشروع مباشرة بسهم 10$.`,
        actions: [
          { type: 'NAVIGATE', payload: '#field-footage', label: 'معاينة 17 صورة ميدانية' },
          { type: 'NAVIGATE', payload: '#live-dispatches', label: 'متابعة البلاغات المباشرة' },
        ],
      };
    }
    return {
      reply: `**أهلاً وسهلاً بك في منصة صدقة أفريقيا**\n\nأنا **أمانة**، مرشدك الميداني الذكي. كيف يمكنني إفادتك اليوم؟\n\n• **حملة الـ 10 دولارات**: المساهمة بأسهم ميسرة للوصول إلى هدف **50,000 دولار** التنموي عبر 5 مراحل معتمدة.\n• **9 برامج إغاثية**: آبار مياه، علاج فقر الدم المنجلي للأطفال، طرود غذائية، ورعاية الأيتام.\n• **المشاريع الإنشائية**: بناء المدارس (20k–70k$) والمستشفيات والمراكز الصحية (43k–150k$).\n• **17 صورة ميدانية**: جولة وثائقية مصورة وحية من الميدان.\n• **الدستور والتقارير**: تحميل الدستور الرسمي المعتمد وتقرير الصرف (85% للمشاريع مباشرة).`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'المساهمة بسهم 10$' },
        { type: 'NAVIGATE', payload: '#field-footage', label: 'مشاهدة 17 صورة ميدانية' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'مشاريع المدارس والمستشفيات' },
      ],
    };
  }

  // FRENCH (Français)
  if (normalizedLang === 'fr') {
    if (query.includes('ecole') || query.includes('hopital') || query.includes('construct') || query.includes('bâtiment')) {
      return {
        reply: `**Grands Projets d'Infrastructure ($20 000 – $150 000)**\n\nSadaqah Africa réalise des constructions civiques durables et vérifiées en Afrique de l'Est :\n\n• **Écoles Primaires Communautaires ($20 000 – $70 000)** :\n  - Bloc de démarrage 3 classes : **$20 000**\n  - Bloc de 6 classes + salle des maîtres : **$45 000**\n  - Académie complète de 8 classes + forage solaire : **$70 000**\n\n• **Hôpitaux et Centres de Santé ($43 000 – $150 000)** :\n  - Clinique de maternité rurale : **$43 000**\n  - Centre de santé communautaire avec lits : **$85 000**\n  - Hôpital régional d'urgence avec bloc opératoire : **$150 000**`,
        actions: [
          { type: 'NAVIGATE', payload: '#infrastructure', label: 'Explorer Écoles & Hôpitaux' },
          { type: 'DONATE', payload: '20000:Community School Construction ($20,000 Starter Block)', label: 'Financer une École ($20k)' },
          { type: 'DONATE', payload: '43000:Hospital & Clinic Construction ($43,000 Maternity Clinic)', label: 'Financer une Maternité ($43k)' },
        ],
      };
    }
    if (query.includes('paiement') || query.includes('donner') || query.includes('mobile') || query.includes('carte') || query.includes('mtn')) {
      return {
        reply: `**Moyens de Paiement et Dons Internationaux**\n\nVous pouvez contribuer facilement en toute sécurité :\n\n• **Mobile Money Afrique de l'Est** :\n  - MTN : Composez \`*165*3#\`, Code marchand : **591024** (SADAQAH AFRICA)\n  - Airtel : Composez \`*185*9#\`, Numéro Paybill : **121400**\n• **Cartes Bancaires (Visa / Mastercard / Amex)** avec reçu officiel immédiat téléchargeable.\n• **PayPal, Virement Bancaire International et Crypto (USDT)**.`,
        actions: [
          { type: 'NAVIGATE', payload: '#donate', label: 'Accéder au Portail de Don' },
          { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Donner une Part de 10 $' },
        ],
      };
    }
    return {
      reply: `**Bienvenue sur Sadaqah Africa**\n\nJe suis **Amanah**, votre assistant IA de terrain. Comment puis-je vous guider ?\n\n• **La Campagne 10 $ vers 50 000 $** : unissez votre geste à des milliers d'autres pour financer nos 5 jalons humanitaires majeurs.\n• **9 Programmes d'Urgence** : Forages d'eau potable, crise drépanocytaire pédiatrique, colis alimentaires et kits de dignité pour jeunes filles.\n• **Infrastructures Majeures** : Construction d'écoles ($20k–$70k) et hôpitaux ruraux ($43k–$150k).\n• **17 Photos du Terrain** : Défilement cinématique et vérification GPS.\n• **Constitution & Transparence** : 85 % des fonds vont directement au terrain.`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Offrir une Part de 10 $' },
        { type: 'NAVIGATE', payload: '#field-footage', label: 'Voir les 17 Photos Terrain' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Écoles et Hôpitaux' },
      ],
    };
  }

  // GERMAN (Deutsch)
  if (normalizedLang === 'de') {
    return {
      reply: `**Herzlich willkommen bei Sadaqah Africa**\n\nIch bin **Amanah**, Ihr digitaler Feldführer. Ich helfe Ihnen bei allen Fragen zu unseren humanitären Projekten in Ostafrika:\n\n• **10 $-Kampagne zum 50.000 $-Fonds**: Wie kleine Anteile Großes bewirken (5 Meilensteine).\n• **9 Hilfsprogramme**: Sauberes Trinkwasser ($950 Brunnen), Sichelzellen-Kinderbehandlung, Nahrungspakete und Waisenfürsorge.\n• **Bauprojekte**: Grundschulen ($20.000 – $70.000) & Krankenhäuser ($43.000 – $150.000).\n• **17 verifizierte Feldfotos**: Reale Baustellen, Trinkwasserbrunnen und GPS-Nachweise.\n• **Satzung & Transparenz**: 85 % der Mittel fließen direkt in die Hilfsprojekte vor Ort.`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: '10 $ Anteil spenden' },
        { type: 'NAVIGATE', payload: '#field-footage', label: '17 Feldfotos ansehen' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Schul- & Klinikbau' },
      ],
    };
  }

  // TURKISH (Türkçe)
  if (normalizedLang === 'tr') {
    return {
      reply: `**Sadaqah Africa'ya Hoş Geldiniz**\n\nBen **Amanah**, yapay zekâ saha rehberiniz. Size nasıl yardımcı olabilirim?\n\n• **10 $ ile 50.000 $ Hedefli Kampanya**: Küçük hisselerle büyük hayırlara vesile olun (5 aşamalı kalkınma planı).\n• **9 Temel Yardım Programı**: Su kuyuları ($950), Orak Hücreli anemi tedavisi, acil gıda kolileri, yetimhane desteği ve katarakt ameliyatları.\n• **Kalıcı Eserler & İnşaat**: Okul projeleri (20.000$ – 70.000$) ve Hastane/Klinik binaları (43.000$ – 150.000$).\n• **17 Doğrulanmış Saha Fotoğrafı**: Canlı kayan şerit ve detaylı inceleme modu.\n• **Şeffaflık & Tüzük**: Fonların %85'i doğrudan sahadaki ihtiyaç sahiplerine ulaştırılmaktadır.`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: '10 $ Hisse Bağışla' },
        { type: 'NAVIGATE', payload: '#field-footage', label: '17 Saha Fotoğrafını Gör' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Okul ve Hastane İnşaatları' },
      ],
    };
  }

  // MALAY / INDONESIAN (Bahasa Melayu / Indonesia)
  if (normalizedLang === 'ms' || normalizedLang === 'id') {
    return {
      reply: `**Selamat Datang ke Sadaqah Africa**\n\nSaya **Amanah**, pembantu AI lapangan anda. Bagaimana saya boleh membantu anda hari ini?\n\n• **Kempen Saham $10 Menuju $50,000**: Setiap saham $10 menggerakkan 5 fasa pembangunan komuniti di Afrika Timur.\n• **9 Program Kebajikan Utama**: Telaga air bersih ($950), rawatan krisis sel sabit kanak-kanak, pek makanan kecemasan, dan pek maruah wanita.\n• **Projek Pembinaan Komuniti**: Sekolah rendah ($20,000 – $70,000) dan hospital/klinik desa ($43,000 – $150,000).\n• **17 Gambar Lapangan Rasmi**: Galeri gambar pergerakan berterusan dengan pengesahan GPS.\n• **Perlembagaan & Amanah 85%**: 85% dana terus kepada penerima manfaat lapangan.`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Sumbang Saham $10' },
        { type: 'NAVIGATE', payload: '#field-footage', label: 'Lihat 17 Gambar Lapangan' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Projek Sekolah & Hospital' },
      ],
    };
  }

  // SWAHILI (Kiswahili)
  if (normalizedLang === 'sw') {
    return {
      reply: `**Karibu Sana Sadaqah Africa**\n\nMimi ni **Amanah**, msaidizi wako wa kidijitali wa uwandani. Nawezaje kukuhudumia leo?\n\n• **Kampeni ya Hisa ya $10 hadi $50,000**: Jiunge nasi kufikia lengo la dola 50,000 katika hatua 5 za kimaendeleo.\n• **Miradi 9 ya Msaada**: Visima vya maji safi ($950), matibabu ya selimundu kwa watoto, chakula cha dharura, na taulo za kike mashuleni.\n• **Ujenzi wa Shule na Hospitali**: Shule za jamii ($20k–$70k) na zahanati/hospitali za kijiji ($43k–$150k).\n• **Picha 17 za Uwandani**: Ushahidi wa moja kwa moja kutoka Kayunga, Mukono na Iganga.\n• **Njia za Malipo**: Tuma kwa urahisi kupitia MTN Mobile Money (*165*3#) au Airtel Money (*185*9#).`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Toa Hisa ya $10' },
        { type: 'NAVIGATE', payload: '#field-footage', label: 'Tazama Picha 17 za Uwandani' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Ujenzi wa Shule na Hospitali' },
      ],
    };
  }

  // URDU (اردو)
  if (normalizedLang === 'ur') {
    return {
      reply: `**صدقہ افریقہ میں خوش آمدید**\n\nمیں **امانہ** ہوں، آپ کا فیلڈ اے آئی گائیڈ۔ میں آپ کی کیا مدد کر سکتا ہوں؟\n\n• **$10 صدقہ مہم ($50,000 ہدف)**: چھوٹے حصص کے ذریعے 5 بڑے فلاحی سنگ میلوں کی تکمیل۔\n• **9 بنیادی امدادی منصوبے**: صاف پانی کے نلکے اور بورہول، بچوں میں سکل سیل کا علاج، ہنگامی راشن، اور یتیموں کی کفالت۔\n• **تعمیراتی منصوبے**: کمیونٹی پرائمری اسکولز ($20k–$70k) اور میٹرنٹی و جنرل اسپتال ($43k–$150k)۔\n• **17 تصدیق شدہ فیلڈ تصاویر**: جی پی ایس تصدیق کے ساتھ موشن گیلری۔\n• **فنڈز کی شفافیت**: 85% عطیات براہ راست فیلڈ پراجیکٹس میں خرچ ہوتے ہیں۔`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: '10$ کا حصہ دیں' },
        { type: 'NAVIGATE', payload: '#field-footage', label: '17 فیلڈ تصاویر دیکھیں' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'اسکول اور اسپتال منصوبے' },
      ],
    };
  }

  // SPANISH (Español)
  if (normalizedLang === 'es') {
    return {
      reply: `**Bienvenido a Sadaqah Africa**\n\nSoy **Amanah**, tu guía de campo inteligente. ¿En qué puedo orientarte hoy?\n\n• **Campaña de $10 hacia los $50.000**: Participa con pequeñas acciones solidarias para alcanzar nuestras 5 fases de impacto cívico.\n• **9 Programas Humanitarios**: Pozos de agua potable ($950), tratamiento pediátrico de anemia falciforme, paquetes de alimentos y kits de dignidad femenina.\n• **Construcción Cívica**: Escuelas comunitarias ($20.000–$70.000) y centros médicos/hospitales ($43.000–$150.000).\n• **17 Fotografías de Campo Verificadas**: Galería dinámica interactiva con geolocalización GPS.\n• **Transparencia**: El 85 % de cada donación se destina directamente al terreno.`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Donar Acción de $10' },
        { type: 'NAVIGATE', payload: '#field-footage', label: 'Ver 17 Fotos de Campo' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Escuelas y Hospitales' },
      ],
    };
  }

  // BENGALI (বাংলা)
  if (normalizedLang === 'bn') {
    return {
      reply: `**সাদাকাহ আফ্রিকায় আপনাকে স্বাগতম**\n\nআমি **আমানাহ**, আপনার ডিজিটাল সহকারী। আমি আপনাকে কীভাবে সাহায্য করতে পারি?\n\n• **$১০ সদকা ক্যাম্পেইন ($৫০,০০০ লক্ষ্য)**: ৫টি ধাপে আফ্রিকা জুড়ে বিশুদ্ধ পানি, খাদ্য ও শিক্ষা প্রদান।\n• **৯টি জরুরি ত্রাণ কর্মসূচি**: গভীর নলকূপ ও টিউবওয়েল ($৯৫০), অসুস্থ শিশুদের চিকিৎসা, খাদ্য সামগ্রী বিতরণ ও এতিম পুনর্বাসন।\n• **স্কুল ও হাসপাতাল নির্মাণ**: প্রাথমিক বিদ্যালয় ($২০,০০০–$৭০,০০০) এবং পল্লী স্বাস্থ্য কমপ্লেক্স ($৪৩,০০০–$১৫০,০০০)।\n• **১৭টি ফিল্ড আলোকচিত্র**: সরাসরি বাস্তব কাজের জিপিএস ভিত্তিক ছবি ও বিবরণ।\n• **৮৫% সরাসরি ফিল্ড বিতরণ**: আমানতদারী ও আন্তর্জাতিক অডিট সনদপ্রাপ্ত।`,
      actions: [
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: '$১০ সদকা শেয়ার প্রদান' },
        { type: 'NAVIGATE', payload: '#field-footage', label: '১৭টি ফিল্ড ছবি দেখুন' },
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'স্কুল ও হাসপাতাল প্রকল্প' },
      ],
    };
  }

  // DEFAULT ENGLISH
  if (query.includes('school') || query.includes('hospital') || query.includes('construct') || query.includes('building') || query.includes('infra')) {
    return {
      reply: `**Major Infrastructure Construction ($20,000 – $150,000)**\n\nSadaqah Africa undertakes verified, permanent civic construction across underserved districts in East Africa:\n\n• **Community Primary Schools ($20,000 – $70,000)**:\n  - 3-Classroom Starter Block: **$20,000**\n  - 6-Classroom Block + Staffroom: **$45,000**\n  - Complete 8-Classroom Academy + Solar Borehole: **$70,000**\n\n• **Hospital & Healthcare Facilities ($43,000 – $150,000)**:\n  - Rural Maternal Outpatient Clinic: **$43,000**\n  - General Health Center with Ward: **$85,000**\n  - Regional Emergency Hospital Block + Surgical Theater: **$150,000**\n\nAll construction phases are overseen by licensed structural engineers with weekly photographic audits.`,
      actions: [
        { type: 'NAVIGATE', payload: '#infrastructure', label: 'Explore Schools & Hospitals' },
        { type: 'DONATE', payload: '20000:Community School Construction ($20,000 Starter Block)', label: 'Sponsor School ($20k)' },
        { type: 'DONATE', payload: '43000:Hospital & Clinic Construction ($43,000 Maternity Clinic)', label: 'Sponsor Clinic ($43k)' },
      ],
    };
  }

  if (query.includes('mtn') || query.includes('airtel') || query.includes('mobile money') || query.includes('momo') || query.includes('ussd') || query.includes('pay') || query.includes('payment')) {
    return {
      reply: `**Mobile Money & Direct Payment Channels**\n\nYou can donate directly via East African Mobile Money, Bank Card, PayPal, or Crypto:\n\n• **MTN Mobile Money** (Uganda, Rwanda, South Sudan):\n  - Dial: \`*165*3#\`\n  - Merchant Code: **591024** (SADAQAH AFRICA)\n  - Reference: Your Name / Chosen Cause\n\n• **Airtel Money** (Uganda, Kenya, Tanzania):\n  - Dial: \`*185*9#\`\n  - Paybill / Business Number: **121400**\n\n• **Cards & PayPal**: Secure instant processing in USD, EUR, GBP, or UGX with automated instant tax-ready receipts.`,
      actions: [
        { type: 'NAVIGATE', payload: '#donate', label: 'Go to Payment Portal' },
        { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Give $10 via Mobile Money' },
      ],
    };
  }

  if (query.includes('photo') || query.includes('picture') || query.includes('footage') || query.includes('video') || query.includes('image') || query.includes('proof')) {
    return {
      reply: `**17 Verified Ground Footage Photographs**\n\nWe provide 100% photographic Amanah accountability. You can inspect all 17 ground photographs in our dual-lane infinite sliding motion reel:\n\n• Clean water hand pumps with boys drinking fresh water\n• Primary school classroom bricklaying at wall-plate level\n• Schoolgirls receiving reusable Softcare sanitary kits\n• Emergency 25kg maize flour family distribution\n• Orphan nutritional care and education centers\n\nEvery photo includes GPS coordinates, district verification, and a one-click button to support that exact project with a $10 share.`,
      actions: [
        { type: 'NAVIGATE', payload: '#field-footage', label: 'Inspect 17 Ground Photos' },
        { type: 'NAVIGATE', payload: '#live-dispatches', label: 'View Live Dispatches' },
      ],
    };
  }

  return {
    reply: `**Assalamu Alaikum & Welcome to Sadaqah Africa**\n\nI am **Amanah**, your AI Field Assistant. Here is how I can guide you through our platform:\n\n• **The $10 Campaign**: How small $10 shares accumulate to reach our landmark **$50,000** goal across 5 milestone phases.\n• **9 Relief Programs**: Clean water, emergency food, pediatric sickle cell, girls dignity kits, orphan education, and cataract surgeries.\n• **Infrastructure**: Community school construction ($20k–$70k) and hospital/clinic construction ($43k–$150k).\n• **17 Ground Photographs**: Live sliding motion gallery showing verified field work.\n• **Payment Methods**: How to donate via MTN Mobile Money, Airtel Money, Cards, PayPal, or Crypto.\n• **Constitution & Aid**: Download our signed Constitution PDF or submit an Emergency Aid Request.`,
    actions: [
      { type: 'DONATE', payload: '10:The $50,000 Campaign Fund', label: 'Give $10 Campaign Share' },
      { type: 'NAVIGATE', payload: '#field-footage', label: 'View 17 Ground Photos' },
      { type: 'NAVIGATE', payload: '#infrastructure', label: 'Schools & Hospitals' },
    ],
  };
}

// Helper to parse [ACTION:TYPE:PAYLOAD|LABEL] tags from AI text
function parseActionsFromText(text: string): { cleanText: string; actions: Array<{ type: string; payload: string; label: string }> } {
  const actions: Array<{ type: string; payload: string; label: string }> = [];
  const actionRegex = /\[ACTION:([A-Z_]+):([^|]+)\|([^\]]+)\]/g;

  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({
      type: match[1],
      payload: match[2].trim(),
      label: match[3].trim(),
    });
  }

  const cleanText = text.replace(actionRegex, '').trim();
  return { cleanText, actions };
}

// API endpoint for AI assistant chat
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { messages, pageContext, language = 'en' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const lastUserMessage = messages[messages.length - 1];
    const userQuery = lastUserMessage?.content || '';
    const selectedLangName = LANGUAGE_NAMES[language] || 'English';

    // If no GEMINI_API_KEY is configured in the environment, use our multilingual knowledge engine
    if (!process.env.GEMINI_API_KEY) {
      const fallback = getMultilingualFallback(userQuery, language);
      return res.json({
        reply: fallback.reply,
        actions: fallback.actions,
        source: 'knowledge-base',
      });
    }

    // Prepare contents array for @google/genai
    const formattedContents = messages.slice(-8).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content) }],
    }));

    const dynamicInstruction = `${SYSTEM_INSTRUCTION}
\nTARGET DONOR LANGUAGE: Respond in ${selectedLangName}. Ensure high cultural sensitivity, correct Islamic charitable terms (Sadaqah Jariyah, Amanah, Waqf), and translate interactive action button labels into ${selectedLangName}.${pageContext ? `\nUSER VIEWPORT CONTEXT: Browsing ${pageContext}.` : ''}`;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 7500)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction: dynamicInstruction,
          temperature: 0.65,
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const rawReply = response.text || '';
      const parsed = parseActionsFromText(rawReply);

      // If no actions were parsed, add language-contextual default actions
      if (parsed.actions.length === 0) {
        const fallback = getMultilingualFallback(userQuery, language);
        parsed.actions = fallback.actions.slice(0, 2);
      }

      return res.json({
        reply: parsed.cleanText || rawReply,
        actions: parsed.actions,
        source: 'gemini-3.8-flash',
      });
    } catch (apiError: any) {
      console.warn('Gemini API call timed out or failed, falling back to multilingual engine:', apiError?.message || apiError);
      const fallback = getMultilingualFallback(userQuery, language);
      return res.json({
        reply: fallback.reply,
        actions: fallback.actions,
        source: 'multilingual-fallback',
      });
    }
  } catch (error: any) {
    console.error('Server error in /api/assistant/chat:', error);
    return res.status(500).json({
      error: 'Failed to process assistant request.',
      message: error?.message || 'Unknown server error',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sadaqah Africa server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
