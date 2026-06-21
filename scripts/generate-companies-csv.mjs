import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RAW = `Rank,Company,Domain,Careers URL,Tier,Estimated Revenue,Revenue Period/Range,Source,Confidence
1,Shopify,shopify.com,shopify.com/careers,Tier 1 ($1B+),~$11.6B,FY2025 (+30% YoY); $378.4B GMV,Company 10-K filing,Confirmed (public)
2,Klarna,klarna.com,klarna.com/careers,Tier 1 ($1B+),~$2.81B,2024,Company financials (NYSE:KLAR),Confirmed (public)
3,Affirm,affirm.com,affirm.com/careers,Tier 1 ($1B+),~$2.32B,FY2024 (+46%),Company 10-K filing,Confirmed (public)
4,Wix,wix.com,wix.com/jobs,Tier 1 ($1B+),~$1.99B,2025,Company financials (NASDAQ:WIX) via StockAnalysis,Confirmed (public)
5,Zendesk,zendesk.com,zendesk.com/jobs,Tier 1 ($1B+),~$1.93B,2024,Latka,Estimated
6,Squarespace,squarespace.com,squarespace.com/careers,Tier 1 ($1B+),~$1.2B,2024; Permira-owned,Company / press,Confirmed (public-to-private)
7,Klaviyo,klaviyo.com,klaviyo.com/careers,Tier 1 ($1B+),~$1.2B,FY2025 (+32%); 193000+ customers,Company financials (NYSE:KVYO),Confirmed (public)
8,Adobe Commerce (Magento),business.adobe.com,adobe.com/careers,Tier 1 ($1B+),Multi-$B (segment),Adobe Digital Experience segment,Company 10-K (segment),Confirmed (segment)
9,Salesforce Commerce Cloud,salesforce.com,salesforce.com/company/careers,Tier 1 ($1B+),Multi-$B (segment),Salesforce segment,Company 10-K (segment),Confirmed (segment)
10,Avalara,avalara.com,careers.avalara.com,Tier 1 ($1B+),~$1B+,2024 est.; Vista-owned,Third-party estimate,Estimated
11,Freshworks,freshworks.com,freshworks.com/company/careers,Tier 2 ($300M-$1B),~$720M,2024,Company financials (NASDAQ:FRSH),Confirmed (public)
12,Attentive,attentive.com,attentive.com/careers,Tier 2 ($300M-$1B),$500M+ ARR,2024,Company,Confirmed (company-stated)
13,ShipBob,shipbob.com,shipbob.com/careers,Tier 2 ($300M-$1B),~$500M,2023,Sacra estimate,Estimated
14,Zuora,zuora.com,zuora.com/careers,Tier 2 ($300M-$1B),~$450M,LTM 2024/25; Silver Lake-owned,Company / press,Estimated
15,Rithum (ChannelAdvisor+CommerceHub),rithum.com,rithum.com/careers,Tier 2 ($300M-$1B),$400M+,est.,Third-party estimate,Estimated
16,Optimizely,optimizely.com,optimizely.com/careers,Tier 2 ($300M-$1B),~$350-400M,est.,Third-party estimate,Estimated
17,BigCommerce / Commerce.com,bigcommerce.com,careers.bigcommerce.com,Tier 2 ($300M-$1B),~$342.3M,FY2025; now Nasdaq:CMRC,Company financials via Digital Commerce 360,Confirmed (public)
18,Riskified,riskified.com,riskified.com/careers,Tier 2 ($300M-$1B),~$327.5M,2024 (+10%); NYSE:RSKD,Company financials,Confirmed (public)
19,Impact.com,impact.com,impact.com/careers,Tier 2 ($300M-$1B),$300M+,est.,Third-party estimate,Estimated
20,Intercom,intercom.com,intercom.com/careers,Tier 2 ($300M-$1B),~$300M+ ARR,est.,Third-party estimate,Estimated
21,Signifyd,signifyd.com,signifyd.com/careers,Tier 2 ($300M-$1B),~$292.8M,2024 est.,Third-party estimate,Estimated
22,Sezzle,sezzle.com,sezzle.com/careers,Tier 2 ($300M-$1B),~$271.1M,2024 (+70%); NASDAQ:SEZL,Company financials,Confirmed (public)
23,Sovos,sovos.com,sovos.com/careers,Tier 2 ($300M-$1B),$500M+,est.,Third-party estimate,Estimated
24,Bazaarvoice,bazaarvoice.com,bazaarvoice.com/careers,Tier 2 ($300M-$1B),~$374-394M,2024 est.,Growjo / ZoomInfo,Estimated
25,Trustpilot,trustpilot.com,corporate.trustpilot.com/careers,Tier 2 ($300M-$1B),~$261M,2024/25; LSE:TRST,Company financials via PitchBook,Confirmed (public)
26,VTEX,vtex.com,careers.vtex.com,Tier 2 ($300M-$1B),~$226M,FY2024; NYSE:VTEX,Company financials via Digital Commerce 360,Confirmed (public)
27,Contentful,contentful.com,contentful.com/careers,Tier 2 ($300M-$1B),~$219M ARR,2024,Sacra estimate,Estimated
28,Mirakl,mirakl.com,mirakl.com/careers,Tier 2 ($300M-$1B),~$218M ARR,2025,Company,Confirmed (company-stated)
29,Yotpo,yotpo.com,yotpo.com/careers,Tier 2 ($300M-$1B),~$213M,2024 est.; $1.4B valuation,Latka,Estimated
30,Forter,forter.com,forter.com/careers,Tier 2 ($300M-$1B),~$200M+,est.,Third-party estimate,Estimated
31,Iterable,iterable.com,iterable.com/careers,Tier 2 ($300M-$1B),~$200M+ ARR,est.,Third-party estimate,Estimated
32,Chargebee,chargebee.com,chargebee.com/careers,Tier 3 ($100M-$300M),~$202.6M,2024 est. (+63%),Third-party estimate,Estimated
33,commercetools,commercetools.com,commercetools.com/careers,Tier 3 ($100M-$300M),~$175M ARR,2024 est.; $1.9B valuation,Latka,Estimated
34,Bloomreach,bloomreach.com,bloomreach.com/en/careers,Tier 3 ($100M-$300M),~$260M+ ARR,2025,Company,Confirmed (company-stated)
35,Salsify,salsify.com,salsify.com/careers,Tier 3 ($100M-$300M),~$140M+ ARR,est.,Third-party estimate,Estimated
36,Sift,sift.com,sift.com/careers,Tier 3 ($100M-$300M),~$122M,est.,Sacra estimate,Estimated
37,Recharge,getrecharge.com,getrecharge.com/careers,Tier 3 ($100M-$300M),~$100M ARR,2024 est.; $282.3M valuation,Latka,Estimated
38,Algolia,algolia.com,algolia.com/careers,Tier 3 ($100M-$300M),~$100M ARR,2024 est.; $2.3B valuation,Latka,Estimated
39,Akeneo,akeneo.com,akeneo.com/careers,Tier 3 ($100M-$300M),~$100M,est.,Third-party estimate,Estimated
40,AfterShip,aftership.com,aftership.com/careers,Tier 4 ($30M-$100M),~$85M ARR,2024 est.; 11K customers,Latka,Estimated
41,Gorgias,gorgias.com,gorgias.com/careers,Tier 4 ($30M-$100M),~$69M ARR,2024,Sacra estimate,Estimated
42,Help Scout,helpscout.com,helpscout.com/company/careers,Tier 4 ($30M-$100M),~$60-70M,est.,Third-party estimate,Estimated
43,Omnisend,omnisend.com,omnisend.com/careers,Tier 4 ($30M-$100M),~$55M ARR,2024 est.; $165M valuation,Latka,Estimated
44,Loop Returns,loopreturns.com,loopreturns.com/careers,Tier 4 ($30M-$100M),~$53.3M,2024 est.,Latka,Estimated
45,Bluecore,bluecore.com,bluecore.com/careers,Tier 4 ($30M-$100M),~$43.7M ARR,2024 est.; $1B valuation,Latka,Estimated
46,VWO (Wingify),vwo.com,vwo.com/careers,Tier 4 ($30M-$100M),~$40M+,est.,Third-party estimate,Estimated
47,Cin7,cin7.com,cin7.com/careers,Tier 4 ($30M-$100M),~$35.8M ARR,2025 est.; $107.3M valuation,Latka,Estimated
48,Tapcart,tapcart.com,tapcart.com/careers,Tier 4 ($30M-$100M),~$27.3M,2024 est.; $81.9M valuation,Latka,Estimated
49,Triple Whale,triplewhale.com,triplewhale.com/careers,Tier 4 ($30M-$100M),~$21.6M,2025 est.,Latka,Estimated
50,Nosto,nosto.com,nosto.com/careers,Tier 4 ($30M-$100M),~$19.6M ARR,2025 est.,Latka,Estimated
51,Constructor.io,constructor.com,constructor.com/careers,Tier 4 ($30M-$100M),~$50M+,est.,Third-party estimate,Estimated
52,Wunderkind,wunderkind.co,wunderkind.co/careers,Tier 4 ($30M-$100M),Private (drives client rev),N/A,No reliable public figure,Undisclosed
53,Listrak,listrak.com,listrak.com/careers,Tier 4 ($30M-$100M),Private,N/A,No reliable public figure,Undisclosed
54,Cordial,cordial.com,cordial.com/careers,Tier 4 ($30M-$100M),Private,N/A,No reliable public figure,Undisclosed
55,Bold Commerce,boldcommerce.com,boldcommerce.com/careers,Tier 4 ($30M-$100M),Private; 760k+ installs,N/A,Company (install count),Undisclosed
56,Postscript,postscript.io,postscript.io/careers,Tier 5 (<$30M / undisclosed),~$11.8M,2024 est.,Latka,Estimated
57,Sendlane,sendlane.com,sendlane.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
58,Drip,drip.com,drip.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
59,Emarsys,emarsys.com,jobs.sap.com,Tier 5 (<$30M / undisclosed),SAP-owned (segment),N/A,Parent company (SAP),Undisclosed (segment)
60,LoyaltyLion,loyaltylion.com,loyaltylion.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
61,Smile.io,smile.io,smile.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
62,Okendo,okendo.io,okendo.io/careers,Tier 5 (<$30M / undisclosed),Private; 4200+ Plus brands,N/A,Company (customer count),Undisclosed
63,Stamped,stamped.io,stamped.io/careers,Tier 5 (<$30M / undisclosed),Private; 75k+ brands,N/A,Company (customer count),Undisclosed
64,Loox,loox.io,loox.io/careers,Tier 5 (<$30M / undisclosed),Bootstrapped,N/A,No reliable public figure,Undisclosed
65,Judge.me,judge.me,judge.me/careers,Tier 5 (<$30M / undisclosed),Bootstrapped,N/A,No reliable public figure,Undisclosed
66,Junip,junip.co,junip.co/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
67,Fera,fera.ai,fera.ai/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
68,Reviews.io,reviews.io,reviews.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
69,PowerReviews,powerreviews.com,powerreviews.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
70,Skio,skio.com,skio.com/careers,Tier 5 (<$30M / undisclosed),Acquired by Recharge (~$105M),N/A,Press (acquisition),Undisclosed
71,Stay AI,stay.ai,stay.ai/careers,Tier 5 (<$30M / undisclosed),Private; 500+ brands,N/A,Company (customer count),Undisclosed
72,Ordergroove,ordergroove.com,ordergroove.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
73,Smartrr,smartrr.com,smartrr.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
74,Recurly,recurly.com,recurly.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
75,Rebuy,rebuyengine.com,rebuyengine.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
76,Justuno,justuno.com,justuno.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
77,Privy,privy.com,privy.com/careers,Tier 5 (<$30M / undisclosed),Attentive-owned,N/A,Parent company (Attentive),Undisclosed
78,OptiMonk,optimonk.com,optimonk.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
79,Octane AI,octaneai.com,octaneai.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
80,Klevu,klevu.com,klevu.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
81,Searchspring,searchspring.com,searchspring.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
82,Findify,findify.io,findify.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
83,Fast Simon,fastsimon.com,fastsimon.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
84,Dynamic Yield,dynamicyield.com,dynamicyield.com/careers,Tier 5 (<$30M / undisclosed),Mastercard-owned,N/A,Parent company (Mastercard),Undisclosed (segment)
85,Lucky Orange,luckyorange.com,luckyorange.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
86,Hotjar,hotjar.com,contentsquare.com/careers,Tier 5 (<$30M / undisclosed),Contentsquare-owned,N/A,Parent company (Contentsquare),Undisclosed (segment)
87,Shogun,getshogun.com,getshogun.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
88,Replo,replo.app,replo.app/careers,Tier 5 (<$30M / undisclosed),YC; private,N/A,No reliable public figure,Undisclosed
89,PageFly,pagefly.io,pagefly.io/careers,Tier 5 (<$30M / undisclosed),Bootstrapped,N/A,No reliable public figure,Undisclosed
90,GemPages,gempages.net,gempages.net/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
91,Narvar,narvar.com,narvar.com/careers,Tier 5 (<$30M / undisclosed),Private; 1500+ customers,N/A,Company (customer count),Undisclosed
92,Route,route.com,route.com/pages/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
93,parcelLab,parcellab.com,parcellab.com/careers,Tier 5 (<$30M / undisclosed),Private (DE),N/A,No reliable public figure,Undisclosed
94,Malomo,gomalomo.com,gomalomo.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
95,Wonderment,wonderment.com,wonderment.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
96,Happy Returns,happyreturns.com,paypal.com/us/careers,Tier 5 (<$30M / undisclosed),PayPal-owned,N/A,Parent company (PayPal),Undisclosed (segment)
97,Tidio,tidio.com,tidio.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
98,Re:amaze,reamaze.com,reamaze.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
99,Richpanel,richpanel.com,richpanel.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
100,Gladly,gladly.com,gladly.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
101,Kustomer,kustomer.com,kustomer.com/careers,Tier 5 (<$30M / undisclosed),Private (ex-Meta),N/A,No reliable public figure,Undisclosed
102,Northbeam,northbeam.io,northbeam.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
103,Rockerbox,rockerbox.com,rockerbox.com/careers,Tier 5 (<$30M / undisclosed),DoubleVerify-owned,N/A,Parent company (DoubleVerify),Undisclosed (segment)
104,Measured,measured.com,measured.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
105,Polar Analytics,polaranalytics.com,polaranalytics.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
106,Lebesgue,lebesgue.io,lebesgue.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
107,Glew,glew.io,glew.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
108,Daasity,daasity.com,daasity.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
109,Linnworks,linnworks.com,linnworks.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
110,Brightpearl,brightpearl.com,sage.com/en-gb/company/careers,Tier 5 (<$30M / undisclosed),Sage-owned,N/A,Parent company (Sage),Undisclosed (segment)
111,Extensiv (Skubana),extensiv.com,extensiv.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
112,ShipHero,shiphero.com,shiphero.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
113,ShipStation,shipstation.com,shipstation.com/careers,Tier 5 (<$30M / undisclosed),Auctane-owned,N/A,Parent company (Auctane),Undisclosed (segment)
114,Shippo,goshippo.com,goshippo.com/careers,Tier 5 (<$30M / undisclosed),$1B valuation; private,N/A,Press (valuation),Undisclosed
115,EasyPost,easypost.com,easypost.com/careers,Tier 5 (<$30M / undisclosed),~$2.2B valuation; private,N/A,Press (valuation),Undisclosed
116,Sendcloud,sendcloud.com,sendcloud.com/careers,Tier 5 (<$30M / undisclosed),Private (NL),N/A,No reliable public figure,Undisclosed
117,Printful,printful.com,printful.com/careers,Tier 5 (<$30M / undisclosed),Large (merged w/ Printify),N/A,Press (merger),Undisclosed
118,Printify,printify.com,printify.com/careers,Tier 5 (<$30M / undisclosed),Merged w/ Printful,N/A,Press (merger),Undisclosed
119,Gelato,gelato.com,gelato.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
120,Refersion,refersion.com,refersion.com/careers,Tier 5 (<$30M / undisclosed),Pantastic-owned,N/A,Parent company (Pantastic),Undisclosed (segment)
121,Awin,awin.com,awin.com/careers,Tier 5 (<$30M / undisclosed),Private; 30k+ advertisers,N/A,Company (advertiser count),Undisclosed
122,CJ Affiliate,cj.com,cj.com/careers,Tier 5 (<$30M / undisclosed),Publicis-owned,N/A,Parent company (Publicis),Undisclosed (segment)
123,Rakuten Advertising,rakutenadvertising.com,rakutenadvertising.com/careers,Tier 5 (<$30M / undisclosed),Rakuten subsidiary,N/A,Parent company (Rakuten),Undisclosed (segment)
124,ShareASale,shareasale.com,awin.com/careers,Tier 5 (<$30M / undisclosed),Awin-owned,N/A,Parent company (Awin),Undisclosed (segment)
125,Partnerize,partnerize.com,partnerize.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
126,Feedonomics,feedonomics.com,feedonomics.com/careers,Tier 5 (<$30M / undisclosed),BigCommerce-owned,N/A,Parent company (BigCommerce),Undisclosed (segment)
127,Channable,channable.com,channable.com/careers,Tier 5 (<$30M / undisclosed),Private (NL),N/A,No reliable public figure,Undisclosed
128,GoDataFeed,godatafeed.com,godatafeed.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
129,DataFeedWatch,datafeedwatch.com,datafeedwatch.com/careers,Tier 5 (<$30M / undisclosed),Cart.com-owned,N/A,Parent company (Cart.com),Undisclosed (segment)
130,Syndigo,syndigo.com,syndigo.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
131,Fabric,fabric.inc,fabric.inc/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
132,Swell,swell.is,swell.is/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
133,Spryker,spryker.com,spryker.com/careers,Tier 5 (<$30M / undisclosed),Private (DE),N/A,No reliable public figure,Undisclosed
134,Medusa,medusajs.com,medusajs.com/careers,Tier 5 (<$30M / undisclosed),Open-source,N/A,No reliable public figure,Undisclosed
135,Saleor,saleor.io,saleor.io/careers,Tier 5 (<$30M / undisclosed),Open-source,N/A,No reliable public figure,Undisclosed
136,Elastic Path,elasticpath.com,elasticpath.com/company/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
137,Nacelle,nacelle.com,nacelle.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
138,Builder.io,builder.io,builder.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
139,Storyblok,storyblok.com,storyblok.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
140,Sanity,sanity.io,sanity.io/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
141,Bolt,bolt.com,bolt.com/careers,Tier 5 (<$30M / undisclosed),~$28M ARR; $11B valuation,est.,Sacra estimate,Estimated
142,TaxJar,taxjar.com,stripe.com/jobs,Tier 5 (<$30M / undisclosed),Stripe-owned,N/A,Parent company (Stripe),Undisclosed (segment)
143,NoFraud,nofraud.com,nofraud.com/careers,Tier 5 (<$30M / undisclosed),Private,N/A,No reliable public figure,Undisclosed
144,Afterpay,afterpay.com,block.xyz/careers,Tier 5 (<$30M / undisclosed),Block-owned,N/A,Parent company (Block),Undisclosed (segment)`;

const CRM_COLUMNS = [
  "name",
  "hq_street",
  "hq_city",
  "hq_state_region",
  "hq_postal_code",
  "hq_country",
  "hq_address_json",
  "country_name",
  "country_code",
  "category_primary",
  "category_tags",
  "website",
  "revenue_amount_usd",
  "revenue_display",
  "revenue_currency",
  "revenue_period",
  "revenue_period_end",
  "revenue_source",
  "linkedin_page",
  "socials_json",
  "estimated_employees",
  "employees_source",
  "careers_page",
];

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function toUrl(value) {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const lines = RAW.trim().split("\n");
const headers = parseCsvLine(lines[0]);
const rows = lines.slice(1).map((line) => {
  const values = parseCsvLine(line);
  const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

  const categoryTags = JSON.stringify({
    rank: Number(record.Rank),
    domain: record.Domain,
    confidence: record.Confidence,
    tier: record.Tier,
  });

  return {
    name: record.Company,
    hq_street: "",
    hq_city: "",
    hq_state_region: "",
    hq_postal_code: "",
    hq_country: "",
    hq_address_json: "",
    country_name: "",
    country_code: "",
    category_primary: record.Tier,
    category_tags: categoryTags,
    website: toUrl(record.Domain),
    revenue_amount_usd: "",
    revenue_display: record["Estimated Revenue"],
    revenue_currency: "USD",
    revenue_period: record["Revenue Period/Range"],
    revenue_period_end: "",
    revenue_source: `${record.Source} (${record.Confidence})`,
    linkedin_page: "",
    socials_json: "",
    estimated_employees: "",
    employees_source: record.Confidence,
    careers_page: toUrl(record["Careers URL"]),
  };
});

const csv = [
  CRM_COLUMNS.join(","),
  ...rows.map((row) => CRM_COLUMNS.map((column) => escapeCsv(row[column])).join(",")),
].join("\n");

const outputPath = join(__dirname, "..", "data", "companies.csv");
writeFileSync(outputPath, `${csv}\n`, "utf8");
console.log(`Wrote ${rows.length} companies to ${outputPath}`);
