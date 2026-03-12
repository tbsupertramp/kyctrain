import { CustomerProfile, EvaluationResult } from "../types";

const callBackend = async (action: string, payload: any, maxRetries = 4): Promise<any> => {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      return await res.json();
    } catch (error: any) {
      lastError = error;
      const errString = error.message?.toLowerCase() || "";
      
      const isQuotaError = errString.includes('429') || 
                           errString.includes('resource_exhausted') ||
                           errString.includes('quota');
                           
      const isServerError = errString.includes('500') || 
                            errString.includes('503');

      if ((isQuotaError || isServerError) && i < maxRetries) {
        const baseWait = isQuotaError ? 2000 : 1000;
        const waitTime = Math.pow(2, i) * baseWait + Math.random() * 1000;
        console.warn(`Backend API busy/limited (attempt ${i + 1}). Retrying in ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const SYSTEM_INSTRUCTION = `Sen bir Kripto Borsası (KVHS) için çalışan "Video KYC Eğitmeni"sin. 
Görevin: Temsilciyi (kullanıcı), profildeki "Aylık Gelir", "Gelir Kaynağı", "Yaş" ve "Yaşanılan Şehir" tutarsızlıklarını yakalaması için eğitmek. Bu konularda temsilciye destek sağlamak ve ne sorması gerektiğini öğretmek.

2026 TÜRKİYE EKONOMİK VERİLERİ (GÜNCEL):
- Asgari Ücret: ~42.000 TL.
- Mavi Yaka / İşçi / Hizmet Sektörü: 55.000 - 85.000 TL.
- Memur / Polis / Bekçi / Öğretmen: 90.000 - 135.000 TL.
- Doktor / Akademisyen / Orta-Üst Yönetici: 180.000 - 450.000 TL.
- Üst Düzey Yönetici: 500.000 TL+.
- Emekli / Askeri Personel (Kıdemli): 70.000 - 150.000 TL.
- Öğrenci / Ev Hanımı: 15.000 - 45.000 TL (Aile/Miras).

İZİN VERİLEN AYLIK GELİR ARALIKLARI: 1-75.000 TL arası, 75.000-150.000 TL arası, 150.000-300.000 TL arası, 300.000-500.000 TL arası, 500.000-1.000.000 TL arası.

İZİN VERİLEN MESLEKLER: armatör, aşçı, avukat, banka çalışanı, berber, kuaför, yazılımcı, danışman, diş hekimi, diyetisyen, döviz bürosu sahibi, döviz bürosu çalışanı, eczacı, eczane çalışanı, emekli, ev hanımı, finans çalışanı, fotoğrafçı, gazeteci, gemi çalışanı, gemi kaptanı, girişimci, grafiker tasarımcı, hakim-savcı, hasta bakıcısı, hostes, iletişim uzmanı, influencer, işçi, işletmeci-küçük esnaf, ithalat-ihracaat uzmanı, kamu sektörü ücretli çalışan, kurumsal şirket hissedarı, mali müşavir, muhasebeci, marangoz, mimar, mühendis, moda tasarımcısı, nakliye-kargo firması sahibi, kurye, öğrenci, öğretmen, özel güvenlik görevlisi, özel sektör ücretli çalışan, özel sektör üst düzey yönetici, pazarcı, pilot, psikolog, rehber, sağlık çalışanı, satış pazarlama, savunma sanayi, serbest meslek, sigortacı, siyasetçi, şoför, sporcu, teknik personel, terzi, temizlikçi, veteriner, yazar, yatırım uzmanı, yerel yönetici.
İZİN VERİLEN GELİR KAYNAKLARI: maaş, ticaret, aile geliri/miras, faiz geliri, kira geliri.

MANTIKSAL KONTROL KURALLARI:
1. MESLEK vs GELİR KAYNAĞI: 
   - 'Maaşlı' (Memur, İşçi, Özel Sektör vb.) kaynağı 'maaş' olmalı. 'ticaret' diyorsa sorgula.
   - 'Esnaf/Serbest Meslek' kaynağı 'ticaret' olmalı.
   - 'Öğrenci/Ev Hanımı/Çalışmıyor' kaynağı 'aile geliri/miras' veya 'kira geliri' olabilir.
2. YAŞ vs MESLEK/VARLIK: 
   - 18-22 yaş arası 'orta üst düzey yönetici' sinsi bir hatadır.
   - Çok genç yaşta (18-20) milyonluk 'miras' veya 'kira geliri' beyanı mutlaka belge gerektirir.
3. E-POSTA KONTROLÜ: Basit harf hataları ÖNEMSİZDİR. Temsilci sadece e-posta adresinin müşterinin ismiyle tamamen alakasız olması (Örn: isim 'Ahmet' e-posta 'fenerbahce1907@...') veya 'nickname' içermesi durumlarını sorgulamalıdır. Temsilcinin teknik domainleri (temp-mail vb.) bilmesi beklenemez.
4. AML & UYUM RİSKLERİ: 
   - ÜÇÜNCÜ ŞAHIS KULLANIMI: Eğer müşteri DİYALOG SIRASINDA "Hesabımı eşim/başkası kullanacak", "Şifremi başkası yönetecek" veya "Uygulama başkasının telefonunda" gibi bir beyanda bulunursa, temsilci bu riski yakalamalı ve işlemi REDDETMELİDİR.
   - ÖNEMLİ: Eğer müşteri bunu diyalogda açıkça söylemediyse ve profil bilgileri tutarlıysa, temsilciyi bu riski "tahmin etmediği" için cezalandırma.
5. LOKASYON vs MESLEK: Çok ücra bir köyde yaşayan bir 'Akademisyen' veya 'Orta-Üst Yönetici' şüphelidir, çalışma şekli (remote vb.) sorgulanmalı.
6. GELİR MİKTARI: Meslek grubuna göre uçuk rakamlar (Örn: İşçi 300.000 TL maaş) sorgulanmalı.
7. MÜŞTERİ BEYANI VE ONAY: Müşterinin beyanları makul bir açıklama içeriyorsa doğru kabul edilebilir. 
   - Örnek: Müşteri 'işçi' ama gelir kaynağı 'kira geliri' ise; temsilci bunu sorguladığında müşteri "Aktif çalışıyorum ama asıl gelirim kiradan geliyor" derse bu açıklama makul kabul edilmeli ve KYC onaylanabilmelidir.
   - Temsilci mantıklı sorularla çelişkiyi giderirse işlemi onaylaması bir hata değil, doğru bir aksiyondur.
8. NETLEŞTİRME SORULARI: Bazı meslekler (Mali Müşavir, Avukat, Yazılımcı vb.) hem maaşlı hem de kendi ofisinde çalışabilir. 
   - Eğer meslek 'Mali Müşavir' ama gelir kaynağı 'maaş' ise, temsilci mutlaka "Kendinize ait bir ofisiniz mi var yoksa bir şirkette maaşlı mı çalışıyorsunuz?" gibi netleştirme soruları sormalıdır. 
   - Bu soruları sormadan onay veren temsilci puan kaybetmelidir.
9. BİLGİ GÜNCELLEME: Müşteri, meslek veya gelir bilgilerini "rastgele" doldurduğunu söylerse veya sorgulama üzerine "aslında mesleğim şu, gelirim bu" diyerek mantıklı ve çelişkisiz yeni bilgiler verirse; temsilci "Doğru bilgileri iletebilirsiniz, ben güncelleyebilirim" diyerek bilgileri güncellemeli ve ardından işlemi onaylamalıdır. Bu durumda temsilci puan kazanmalıdır.`;

export const generateScenario = async (difficulty: 'kolay' | 'orta' | 'zor' = 'orta'): Promise<CustomerProfile> => {
  const archetypes = [
    "MESLEK-GELİR KAYNAĞI ÇELİŞKİSİ: Meslek maaşlı ama kaynak 'ticaret'.",
    "KRİTİK E-POSTA HATASI: E-posta adı tamamen farklı veya nickname.",
    "KUSURSUZ: Her şey 2026 şartlarına tam uyumlu ve mantıklı.",
    "SINIRDA EKONOMİK: Gelir, meslek grubuna göre %25 daha yüksek. Belge istenmeli.",
    "YAŞ-MESLEK ÇELİŞKİSİ: 19 yaşında 'orta üst düzey yönetici'.",
    "ÜÇÜNCÜ ŞAHIS RİSKİ: Profil tutarlı görünebilir ancak müşteri diyalogda 'Hesabı eşim yönetecek' veya 'Uygulama eşimin telefonunda' diyecektir. (RED: Sadece beyan gelirse)",
    "GELİR KAYNAĞI ŞÜPHESİ: Mesleği 'öğrenci' ama geliri 200.000 TL 'faiz geliri' diyor. (SORGULA)",
    "KİRA GELİRİ TUTARSIZLIĞI: 'çalışmıyor' ama 500.000 TL 'kira geliri' beyan ediyor. (BELGE)",
    "LOKASYON-MESLEK ÇELİŞKİSİ: Mezrada yaşayan 'Orta-Üst Düzey Yönetici'. (SORGULA)",
    "ANİ VARLIK ARTIŞI: 'İşçi' ama 10 milyon TL 'miras' beyan ediyor. (BELGE)",
    "E-POSTA İSİM UYUMSUZLUĞU: E-posta adresi müşterinin adıyla tamamen alakasız veya bir nickname. (SORGULA)",
    "DİJİTAL GÖÇEBE ÇELİŞKİSİ: 'Devlet memuru' ama 'Tayland'dan remote çalışıyorum' diyor. (SORGULA/RED)",
    "AML / YAŞLI İSTİSMARI: 75 yaşında 'Emekli', 'Torunumun yönlendirmesiyle hesap açıyorum' diyor. (RED)",
    "GELİR-LOKASYON-MESLEK ÜÇGENİ: 'Esnaf' ama aylık 1.5M TL 'ticaret' geliri beyan ediyor, dükkanı çok küçük bir ilçede. (BELGE)",
    "MESLEK-GELİR KAYNAĞI MUĞLAKLIĞI: 'Mali Müşavir' ama kaynak 'maaş'. (SORGULA: Ofis mi, maaşlı mı?)",
    "MESLEK-GELİR KAYNAĞI MUĞLAKLIĞI: 'Avukat' ama kaynak 'ticaret'. (SORGULA: Baro kaydı/Ofis durumu?)",
    "MESLEK-GELİR KAYNAĞI MUĞLAKLIĞI: 'Yazılımcı' ama kaynak 'kira geliri'. (SORGULA: Aktif çalışma durumu?)",
    "MESLEK-GELİR KAYNAĞI MUĞLAKLIĞI: 'Döviz Bürosu Sahibi' ama kaynak 'maaş'. (KRİTİK ÇELİŞKİ)",
    "MESLEK-GELİR KAYNAĞI MUĞLAKLIĞI: 'Girişimci' ama kaynak 'maaş'. (SORGULA: Exit mi yaptı, bordrolu mu?)",
    "RASTGELE VERİ GİRİŞİ: Müşteri yüksek gelir beyan etmiş ama sorgulayınca 'Rastgele doldurdum' diyor. (GÜNCELLE & ONAY)",
    "DÜZELTME BEYANI: Müşteri sorgulama üzerine 'Aslında mesleğim X, gelirim Y' diyerek mantıklı bilgi veriyor. (GÜNCELLE & ONAY)"
  ];
  
  const randomArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];

  const payload = {
    model: "gemini-3-flash-preview",
    contents: `Zorluk Seviyesi: "${difficulty}". Archetype: "${randomArchetype}". 
    Lütfen SADECE belirtilen meslek ve gelir kaynaklarını kullanarak zorlayıcı ve sinsi bir senaryo yarat. 
    Zorluk seviyesine göre sinsilik dozunu ayarla:
    - kolay: Hata daha belirgin, konuşma daha açık.
    - orta: Hata satır aralarında, biraz sorgulama gerektirir.
    - zor: Hata çok sinsi, derinlemesine sorgulama ve 2026 verilerine tam hakimiyet gerektirir.
    
    2026 Türkiye şartlarına uygun, temsilciyi terletecek detaylar ekle. 
    Karakterin konuşma tarzı doğal olsun, hatayı direkt söylemesin, satır aralarına gizle.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          fullName: { type: "STRING" },
          city: { type: "STRING" },
          age: { type: "INTEGER" },
          profession: { type: "STRING" },
          incomeSource: { type: "STRING" },
          monthlyIncome: { 
            type: "STRING", 
            enum: ["1-75.000 TL arası", "75.000-150.000 TL arası", "150.000-300.000 TL arası", "300.000-500.000 TL arası", "500.000-1.000.000 TL arası"] 
          },
          email: { type: "STRING" },
          hiddenContradiction: { type: "STRING", description: "Temsilcinin bulması gereken asıl mantık hatası veya 'KUSURSUZ' ibaresi." },
          scenarioType: { type: "STRING", enum: ["Onay", "Red", "Belge Talebi", "Uyum"] },
          difficulty: { type: "STRING", enum: ["kolay", "orta", "zor"] }
        },
        required: ["fullName", "city", "age", "profession", "incomeSource", "monthlyIncome", "email", "hiddenContradiction", "scenarioType", "difficulty"]
      }
    }
  };

  const response = await callBackend('generateScenario', payload);
  return JSON.parse(response.text);
};

export const evaluateResponse = async (
  profile: CustomerProfile,
  userMessage: string,
  history: any[]
): Promise<EvaluationResult> => {
  const payload = {
    model: "gemini-3-flash-preview",
    contents: `Profil: ${JSON.stringify(profile)}\nKullanıcı Hamlesi: "${userMessage}"\nGeçmiş: ${JSON.stringify(history)}`,
    config: {
      systemInstruction: `Kullanıcının hamlesini 2026 KYC protokollerine göre detaylıca değerlendir.
      
      PUANLAMA RUBRİĞİ (Toplam 100 Puan):
      1. Mantık ve Tutarlılık (60 Puan): Meslek, gelir, yaş ve lokasyon arasındaki sinsi çelişkileri yakalama.
      2. AML ve Risk Yönetimi (20 Puan): Üçüncü şahıs kullanımı risklerini doğru yönetme.
      3. İletişim ve Profesyonellik (20 Puan): Müşteriye yaklaşım, doğru soruları sorma ve profesyonel tavır.

      GELİR ARALIKLARI: 1-75.000 TL arası, 75.000-150.000 TL arası, 150.000-300.000 TL arası, 300.000-500.000 TL arası, 500.000-1.000.000 TL arası.

      MESLEKLER: armatör, aşçı, avukat, banka çalışanı, berber, kuaför, yazılımcı, danışman, diş hekimi, diyetisyen, döviz bürosu sahibi, döviz bürosu çalışanı, eczacı, eczane çalışanı, emekli, ev hanımı, finans çalışanı, fotoğrafçı, gazeteci, gemi çalışanı, gemi kaptanı, girişimci, grafiker tasarımcı, hakim-savcı, hasta bakıcısı, hostes, iletişim uzmanı, influencer, işçi, işletmeci-küçük esnaf, ithalat-ihracaat uzmanı, kamu sektörü ücretli çalışan, kurumsal şirket hissedarı, mali müşavir, muhasebeci, marangoz, mimar, mühendis, moda tasarımcısı, nakliye-kargo firması sahibi, kurye, öğrenci, öğretmen, özel güvenlik görevlisi, özel sektör ücretli çalışan, özel sektör üst düzey yönetici, pazarcı, pilot, psikolog, rehber, sağlık çalışanı, satış pazarlama, savunma sanayi, serbest meslek, sigortacı, siyasetçi, şoför, sporcu, teknik personel, terzi, temizlikçi, veteriner, yazar, yatırım uzmanı, yerel yönetici.

      KRİTERLER:
      - Kritik Hata: AML riskini (3. şahıs) fark etmemek veya yanlış karar (Onay yerine Red veya tersi) vermek. 
        *ÖNEMLİ: Üçüncü şahıs (3. şahıs) riski sadece müşteri DİYALOGDA bunu açıkça beyan ettiyse (Örn: "Eşim yönetecek") bir hata olarak kabul edilebilir. Eğer müşteri henüz bunu söylemediyse ve temsilci onay verdiyse, bu bir hata DEĞİLDİR. Temsilciye "Neden sormadın?" diye ceza verme.* (-50 Puan)
      - Sinsi Detay: E-posta isim uyumsuzluğu, yaş-kıdem veya lokasyon çelişkisini yakalamak. (+20 Puan)
      - Netleştirme: Meslek-Gelir uyuşmazlığında (Örn: Mali Müşavir-Maaş) doğru detaylandırma sorusunu sormak. (+15 Puan)
      - Gereksiz Süreç: Kusursuz profilde veya makul açıklama yapılan durumlarda belge isteyip süreci uzatmak. (-15 Puan)
      - Eksik Sorgulama: Meslek-Gelir uyuşmazlığını (Örn: Avukat-Ticaret) sorgulamadan direkt aksiyon almak. (-25 Puan)
      - Makul Açıklama: Eğer müşteri bir çelişkiyi (Örn: İşçi-Kira geliri) mantıklı bir şekilde açıklarsa (Örn: "Çalışıyorum ama kiradan daha çok kazanıyorum"), temsilcinin bu beyanı kabul edip onay vermesi DOĞRU bir aksiyondur.
      - Bilgi Güncelleme: Müşteri "rastgele doldurdum" derse veya yeni/mantıklı bilgi verirse, temsilcinin "bilgileri güncelleyebilirim" demesi ve ardından onaylaması en yüksek puanı (+30 Puan) kazandırır.
      
      EĞİTMEN TAVRI: 
      - Eğer kullanıcı bir soru sorduysa, müşteri (customer) gibi cevap ver. Bu durumda analiz kısmını boş bırakabilirsin veya minimum tutabilirsin.
      - Eğer kullanıcı bir aksiyon (Onay/Red/Belge/Uyum) aldıysa, eğitmen (trainer) olarak detaylı analiz yap.
      - ANALİZ KURALI: Analiz yaparken SADECE diyalogda (history) geçen bilgileri kullan. "hiddenContradiction" alanındaki bilgi diyalogda henüz geçmediyse, temsilci bunu "bilmiyor" kabul edilmelidir. 
      - ÖRNEK: Eğer hiddenContradiction "Üçüncü şahıs riski" ise ama müşteri henüz "Eşim kullanacak" demediyse; temsilci onay verdiğinde ona "3. şahıs riskini kaçırdın" DEME. Çünkü henüz beyan edilmedi. Bu durumda işlemi 'Doğru' kabul et.
      - Müşteri rolündeyken, temsilci çelişkiyi sorduğunda bazen dürüst ve makul açıklamalar yap (Örn: "Evet işçiyim ama aileden kalan evlerin kirasıyla geçiniyorum"). Temsilci bu açıklamayı kabul ederse puan kırma.
      - Müşteri rolündeyken, "rastgele doldurdum" veya "aslında gelirim şu" gibi düzeltmeleri sadece temsilci çelişkiyi sorduğunda yap.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          role: { type: "STRING", enum: ["customer", "trainer"] },
          text: { type: "STRING" },
          isCorrect: { type: "BOOLEAN" },
          points: { type: "NUMBER" },
          analysis: {
            type: "OBJECT",
            properties: {
              logicScore: { type: "NUMBER", description: "0-40 arası" },
              amlScore: { type: "NUMBER", description: "0-40 arası" },
              communicationScore: { type: "NUMBER", description: "0-20 arası" },
              feedbackDetails: { type: "STRING", description: "Neyi iyi yaptı, neyi kaçırdı?" },
              missedDetails: { 
                type: "ARRAY", 
                items: { type: "STRING" },
                description: "Temsilcinin fark etmediği sinsi detayların listesi."
              }
            },
            required: ["logicScore", "amlScore", "communicationScore", "feedbackDetails", "missedDetails"]
          }
        },
        required: ["role", "text", "isCorrect", "points"]
      }
    }
  };

  const response = await callBackend('evaluateResponse', payload);
  return JSON.parse(response.text);
};

export const getQuestionSuggestion = async (
  profile: CustomerProfile,
  history: any[]
): Promise<string> => {
  const payload = {
    model: "gemini-3-flash-preview",
    contents: `Profil: ${JSON.stringify(profile)}\nİpucu ver.`,
    config: {
      systemInstruction: "Maksimum 3 kelime. Örn: 'Meslek-kaynak uyumu', 'Email sinsi hatası', 'Gelir beyanı sorgula'.",
    },
  };
  
  const response = await callBackend('getQuestionSuggestion', payload);
  return response.text || "Profili inceleyin.";
};
