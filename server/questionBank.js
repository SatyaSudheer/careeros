// System Design Question Bank — 10 archetypes.
// Sources: "System Design Interview Roadmap — FAANG Question Bank" (#1–100)
// and hellointerview.com problem breakdowns (#101+, non-duplicate problems only).
// Seeded into shared.question_bank on first run; practice state lives in the
// personal DB. Users can add their own questions in any category.

const SEED_CATEGORY = 'System Design';
const ML_CATEGORY = 'ML System Design';

// Suggested categories offered in the "add question" form. Free text is also
// allowed — this list only drives the picker and the tab ordering.
const CATEGORIES = [
  'System Design',
  'ML System Design',
  'Low Level Design',
  'System Design Patterns',
  'Behavioral & Leadership',
  'Coding & Algorithms',
  'Domain Knowledge',
  'General',
];

const ARCHETYPES = [
  { name: 'Social Feed',                    probe: 'Write-fanout vs. read-fanout. Ranking pipeline. Hot users, cold users.' },
  { name: 'Real-time Messaging',            probe: 'Long-lived connections. At-most-once vs at-least-once delivery. Presence.' },
  { name: 'Marketplace & Matching',         probe: 'Geo-search. Supply/demand index. Booking-state and idempotent reservation.' },
  { name: 'File Sync & Storage',            probe: 'Chunking. Conflict resolution. Multi-device consistency.' },
  { name: 'Streaming Media',                probe: 'Encoding ladder. CDN edge. Adaptive bitrate. Cold start.' },
  { name: 'Search, Autocomplete & Ranking', probe: 'Inverted index. Ranking pipeline. Query understanding.' },
  { name: 'Counters & Rate Limits',         probe: 'Lots of writes, eventually consistent. Token bucket. Hot keys.' },
  { name: 'Money Movement',                 probe: 'Idempotency keys. Double-entry ledger. Reconciliation. Audit trail.' },
  { name: 'Infrastructure & Platform',      probe: 'Reliability primitives. Operational SLOs. Multi-tenancy.' },
  { name: 'Specialized Systems',            probe: "Domain-specific patterns that don't cleanly fit the others." },
];

// [number, question, level, companies, archetypeIndex]
const QUESTIONS = [
  [1,  "Design Twitter / X timeline", 'L5', 'Twitter, Meta, LinkedIn, broadly across FAANG', 0],
  [2,  "Design Instagram feed ranking", 'L5–L6', 'Meta (domain), Pinterest, Snap', 0],
  [3,  "Design TikTok 'For You' feed", 'L5–L6', 'ByteDance (domain), Meta, YouTube', 0],
  [4,  "Design Reddit's front page", 'L5', 'Reddit (domain), broadly asked', 0],
  [5,  "Design Pinterest's home feed", 'L5', 'Pinterest (domain), Meta, content platforms', 0],
  [6,  "Design YouTube recommendations / next-up", 'L6', 'Google (domain), Netflix, Spotify', 0],
  [7,  "Design LinkedIn news feed", 'L5', 'Microsoft / LinkedIn (domain), Meta', 0],
  [8,  "Design Instagram / Facebook Stories (24-hr expiry)", 'L5', 'Meta (domain), Snap', 0],
  [9,  "Design Twitter trending topics", 'L5–L6', 'Twitter (domain), broadly asked', 0],
  [10, "Design a news aggregator (Apple News / Google News)", 'L6', 'Apple, Google', 0],
  [11, "Design Quora / Stack Overflow feed ranking", 'L5', 'Q&A platforms, broadly asked', 0],
  [12, "Design a friend recommendation system (PYMK)", 'L5–L6', 'Meta, LinkedIn', 0],
  [13, "Design WhatsApp / iMessage", 'L5', 'Meta (domain), Apple (domain), broadly asked', 1],
  [14, "Design Slack", 'L5–L6', 'Salesforce / Slack (domain), Microsoft, broadly asked', 1],
  [15, "Design Discord (text + voice channels)", 'L6', 'Discord (domain), specialized comms platforms', 1],
  [16, "Design Zoom / video conferencing", 'L6', 'Zoom, Google (Meet), Microsoft (Teams)', 1],
  [17, "Design Twitter Spaces / Clubhouse (live audio)", 'L5–L6', 'Twitter, audio-first platforms', 1],
  [18, "Design real-time collaborative editor (Google Docs)", 'L6', 'Google (domain), Notion, Microsoft', 1],
  [19, "Design a presence service (online / offline / typing)", 'L5', 'broadly asked across messaging companies', 1],
  [20, "Design Facebook Live / TikTok Live", 'L6', 'Meta, ByteDance, streaming platforms', 1],
  [21, "Design a group video call with screen sharing", 'L6', 'Zoom, Google, Apple', 1],
  [22, "Design end-to-end encrypted messaging", 'L6', 'Meta (Signal-style), Apple, security-focused roles', 1],
  [23, "Design Uber / Lyft dispatch", 'L5–L6', 'Uber (domain), Lyft, ride-share companies, broadly asked', 2],
  [24, "Design DoorDash / food delivery", 'L5–L6', 'DoorDash (domain), Uber Eats, delivery platforms', 2],
  [25, "Design Airbnb booking system", 'L5–L6', 'Airbnb (domain), travel and reservation platforms', 2],
  [26, "Design ride-share surge pricing", 'L6', 'Uber (domain), pricing systems', 2],
  [27, "Design Tinder / Bumble matching", 'L5', 'Match Group, dating platforms', 2],
  [28, "Design a parking-lot / inventory reservation system", 'L5', 'Amazon, broadly asked', 2],
  [29, "Design a ticket-booking system (StubHub / BookMyShow)", 'L5', 'ticketing platforms, broadly asked', 2],
  [30, "Design Yelp / location-based business search", 'L5', 'Yelp (domain), Google, Apple', 2],
  [31, "Design Amazon's product search", 'L6', 'Amazon (domain), e-commerce companies', 2],
  [32, "Design an online auction / eBay bidding", 'L5–L6', 'eBay (domain), marketplace platforms', 2],
  [33, "Design Google Drive / Dropbox", 'L5–L6', 'Google (domain), Dropbox (domain), broadly asked', 3],
  [34, "Design Dropbox sync (multi-device, conflict resolution)", 'L6', 'Dropbox (domain), Apple iCloud', 3],
  [35, "Design a distributed file system (HDFS-style)", 'L6', 'data infrastructure roles, broadly asked', 3],
  [36, "Design a photo storage service (iCloud Photos)", 'L5–L6', 'Apple (domain), Google Photos', 3],
  [37, "Design Amazon S3 / object storage", 'L6', 'Amazon AWS (domain), cloud platforms', 3],
  [38, "Design Git / version control storage", 'L6', 'GitHub, GitLab, infrastructure roles', 3],
  [39, "Design a cloud backup service (Backblaze-style)", 'L5', 'backup-focused companies, broadly asked', 3],
  [40, "Design CDN edge caching (Cloudflare-style)", 'L6', 'Cloudflare, Fastly, Akamai, infrastructure roles', 3],
  [41, "Design Netflix video streaming", 'L5–L6', 'Netflix (domain), broadly asked', 4],
  [42, "Design YouTube (upload + playback)", 'L6', 'Google (domain), video platforms', 4],
  [43, "Design Spotify audio streaming", 'L5–L6', 'Spotify (domain), audio platforms', 4],
  [44, "Design a live-streaming platform (Twitch)", 'L6', 'Twitch, Amazon, streaming roles', 4],
  [45, "Design Apple Music's catalog", 'L5', 'Apple (domain), music platforms', 4],
  [46, "Design a podcast platform", 'L5', 'Spotify, Apple, audio platforms', 4],
  [47, "Design adaptive bitrate streaming", 'L6', 'Netflix, YouTube, video roles', 4],
  [48, "Design a video-encoding pipeline", 'L6', 'video platforms, infrastructure roles', 4],
  [49, "Design Google Search (high-level architecture)", 'L6', 'Google (domain), search-focused roles', 5],
  [50, "Design typeahead / search autocomplete", 'L5', 'Google, Amazon, broadly asked', 5],
  [51, "Design a web crawler (Googlebot)", 'L6', 'Google (domain), search infrastructure', 5],
  [52, "Design Amazon product search", 'L6', 'Amazon (domain), e-commerce search', 5],
  [53, "Design a recommendation engine (collaborative filtering)", 'L6', 'Netflix, Spotify, Amazon', 5],
  [54, "Design semantic search with vector databases", 'L6', 'AI / ML companies, modern search roles', 5],
  [55, "Design Yelp's nearby search (geospatial)", 'L5–L6', 'Yelp, Google, geo-search platforms', 5],
  [56, "Design Google Maps directions / routing", 'L6', 'Google (domain), Apple, mapping roles', 5],
  [57, "Design a duplicate-detection system", 'L5–L6', 'broadly asked, content platforms', 5],
  [58, "Design a news ranking system", 'L6', 'Apple News, Google News, content platforms', 5],
  [59, "Design a distributed rate limiter", 'L5–L6', 'Stripe, Cloudflare, broadly asked across FAANG', 6],
  [60, "Design a view-counter system (YouTube views)", 'L5', 'Google, video platforms', 6],
  [61, "Design a like / reaction counter", 'L5', 'Meta, social platforms', 6],
  [62, "Design an API gateway with throttling", 'L6', 'Amazon AWS, Google, infrastructure roles', 6],
  [63, "Design a leaderboard (real-time rankings)", 'L5', 'gaming, broadly asked', 6],
  [64, "Design a distributed counter (Redis-style)", 'L5', 'broadly asked', 6],
  [65, "Design CAPTCHA / bot detection", 'L6', 'Google, Cloudflare, security-focused roles', 6],
  [66, "Design a feature flag system (LaunchDarkly-style)", 'L5–L6', 'infrastructure roles, broadly asked', 6],
  [67, "Design a quota and billing system", 'L6', 'AWS, GCP, SaaS companies', 6],
  [68, "Design a real-time analytics counter", 'L5–L6', 'ad-tech, analytics platforms', 6],
  [69, "Design Stripe / a payment processor", 'L6', 'Stripe (domain), payment companies, broadly asked', 7],
  [70, "Design payment fraud detection", 'L6', 'Stripe, Visa, payment platforms', 7],
  [71, "Design Robinhood / a trading exchange", 'L6', 'Robinhood, fintech, low-latency roles', 7],
  [72, "Design a digital wallet (Apple Pay / Google Pay)", 'L6', 'Apple, Google, fintech', 7],
  [73, "Design a subscription billing system", 'L5–L6', 'Stripe, SaaS companies', 7],
  [74, "Design a peer-to-peer payment system (Venmo / Cash App)", 'L6', 'Block, PayPal, fintech', 7],
  [75, "Design a refund / chargeback workflow", 'L5–L6', 'payment platforms, e-commerce', 7],
  [76, "Design a double-entry ledger", 'L6', 'Stripe, fintech, accounting platforms', 7],
  [77, "Design ad real-time bidding (RTB)", 'L6', 'Google, Meta, Amazon ad platforms', 7],
  [78, "Design a currency-conversion service", 'L5', 'fintech, payment platforms', 7],
  [79, "Design a URL shortener (bit.ly)", 'L4–L5', 'broadly asked across FAANG (the classic)', 8],
  [80, "Design a distributed cache (Redis-style)", 'L6', 'infrastructure roles, broadly asked', 8],
  [81, "Design a distributed task queue (Celery / SQS)", 'L5–L6', 'Amazon, broadly asked', 8],
  [82, "Design a metrics / monitoring system (Datadog)", 'L6', 'Datadog, infrastructure roles, observability', 8],
  [83, "Design a log aggregation system (ELK / Splunk)", 'L6', 'infrastructure roles, broadly asked', 8],
  [84, "Design a CI/CD pipeline", 'L5–L6', 'GitHub, GitLab, infrastructure roles', 8],
  [85, "Design a service mesh (Istio-style)", 'L6–L7', 'infrastructure roles', 8],
  [86, "Design a feature store for ML", 'L6', 'ML platform roles, broadly asked', 8],
  [87, "Design a configuration management service", 'L5', 'infrastructure roles', 8],
  [88, "Design a notification service (push, email, SMS)", 'L5', 'broadly asked across FAANG', 8],
  [89, "Design a webhook delivery system", 'L5–L6', 'Stripe, GitHub, SaaS platforms', 8],
  [90, "Design a job scheduler (cron at scale)", 'L6', 'infrastructure roles, broadly asked', 8],
  [91, "Design Pastebin", 'L4–L5', 'broadly asked, often as an entry-level question', 9],
  [92, "Design a code editor (Leetcode / CodePen)", 'L5–L6', 'developer-tools companies', 9],
  [93, "Design a quiz platform (Kahoot real-time)", 'L5', 'broadly asked', 9],
  [94, "Design Google Calendar", 'L5–L6', 'Google, productivity platforms', 9],
  [95, "Design Gmail / an email service", 'L6', 'Google, email-focused roles', 9],
  [96, "Design a flight-booking system", 'L5–L6', 'travel platforms, broadly asked', 9],
  [97, "Design an IoT data ingestion pipeline", 'L6', 'AWS, GCP, IoT-focused roles', 9],
  [98, "Design GitHub", 'L6', 'GitHub, GitLab, developer platforms', 9],
  [99, "Design an online whiteboard (Miro / Figma)", 'L6', 'Figma, design-tool companies', 9],
  [100, "Design a multi-player online game backend", 'L6', 'gaming companies, real-time roles', 9],

  // ── Additions from hellointerview.com problem breakdowns ────────────────────
  // Only problems with no equivalent above — variants that are the same
  // archetype in a different skin (Bitly→#79, Ticketmaster→#29, Uber→#23…)
  // are deliberately not duplicated.
  [101, "Design a local delivery service (Gopuff-style)", 'L5–L6', 'Gopuff, Instacart, delivery platforms', 2],
  [102, "Design Facebook Live comments", 'L6', 'Meta, live-streaming platforms', 1],
  [103, "Design Facebook post search", 'L6', 'Meta, social platforms, broadly asked', 5],
  [104, "Design YouTube Top-K views (heavy hitters)", 'L6', 'Google, analytics platforms', 6],
  [105, "Design an ad click aggregator", 'L6', 'Meta, Google, ad-tech platforms', 6],
  [106, "Design a price-tracking service (CamelCamelCamel)", 'L5', 'e-commerce, price-comparison platforms', 9],
  [107, "Design Strava (activity tracking)", 'L5', 'Strava, fitness and geo platforms', 9],
  [108, "Design an online chess platform", 'L6', 'Chess.com, Lichess, gaming companies', 9],
  [109, "Design ChatGPT / an LLM inference platform", 'L6', 'OpenAI, Anthropic, AI infrastructure roles', 9],
  // Real-world case study with no equivalent above — #15 covers Discord's
  // real-time channels, not the write-heavy message-storage problem.
  [110, "Design message storage at scale (Discord case study)", 'L6', 'Discord, messaging platforms, storage roles', 1],

  // ── Additions from systemdesignschool.io/problems ───────────────────────────
  // Only problems with no equivalent above. A distributed message queue is a
  // different probe from #81's task queue (log storage, partitions, consumer
  // groups vs. job dispatch and retries); a durable key-value store is a
  // different probe from #80's cache; an online judge is a different probe from
  // #92's code editor (sandboxed execution vs. collaborative editing).
  [111, "Design a distributed message queue (Kafka-style)", 'L6', 'Amazon, Confluent, infrastructure roles, broadly asked', 8],
  [112, "Design a distributed key-value store (DynamoDB / Cassandra-style)", 'L6', 'Amazon, Meta, infrastructure roles, broadly asked', 8],
  [113, "Design an online judge / code execution engine (LeetCode)", 'L6', 'developer-tools companies, broadly asked', 9],
];

// ── ML System Design ──────────────────────────────────────────────────────────
// Source: hellointerview.com ML system design breakdowns + the canonical
// problem list on that section's introduction page.
// ML interviews probe a different axis than system design — data and labels,
// training/serving skew, offline vs online evaluation — so this bank has its
// own archetypes rather than reusing the system-design ones.

// Index order is load-bearing: 0–2 must keep their meaning because seeded
// questions reference archetypes positionally. New archetypes append only.
const ML_ARCHETYPES = [
  { name: 'Recommendation & Ranking',   probe: 'Candidate generation vs. ranking. Cold start. Feedback loops and position bias.' },
  { name: 'Trust & Safety',             probe: 'Label scarcity. Adversarial drift. Precision/recall trade-offs at moderation scale.' },
  { name: 'ML Platform & Serving',      probe: 'Training/serving skew. Feature freshness. Distributed training. Inference latency and cost.' },
  { name: 'Search & Retrieval',         probe: 'Learning to rank. Query understanding. Recall vs precision in retrieval.' },
  { name: 'Prediction & Forecasting',   probe: 'Target leakage. Temporal validation. Calibration and business-metric alignment.' },
  { name: 'NLP & LLM Systems',          probe: 'Retrieval grounding. Hallucination and eval. Token cost, latency, and context limits.' },
  { name: 'Computer Vision',            probe: 'Labeling cost. Augmentation and class imbalance. Edge vs. cloud inference.' },
  { name: 'Experimentation & Monitoring', probe: 'Offline/online metric gap. Drift detection. Guardrail metrics and rollback.' },
];

// [number, question, level, companies, archetypeIndex] — numbered from 201 to
// leave room for the system-design bank to grow. Numbers are stable identifiers
// (practice state keys off them), so never renumber an existing entry.
const ML_QUESTIONS = [
  // Trust & Safety
  [201, "Design a harmful content detection system (content moderation)", 'L5–L6', 'Meta, TikTok, trust & safety roles', 1],
  [202, "Design a bot / spam account detection system", 'L5–L6', 'Meta, Google, Cloudflare, trust & safety roles', 1],
  [205, "Design a payment fraud detection model", 'L6', 'Stripe, Visa, fintech, risk roles', 1],
  [220, "Design a misinformation / fake-news detection system", 'L6', 'Meta, X, YouTube, trust & safety roles', 1],
  [221, "Design a deepfake / synthetic-media detector", 'L6', 'Meta, Google, TikTok, integrity roles', 1],
  [222, "Design a safety classifier for LLM outputs (guardrails)", 'L6', 'OpenAI, Anthropic, Google, AI safety roles', 1],

  // Recommendation & Ranking
  [203, "Design a video recommendation system", 'L5–L6', 'YouTube, TikTok, Netflix', 0],
  [204, "Design an e-commerce product recommendation system", 'L5', 'Amazon, Shopify, e-commerce platforms', 0],
  [209, "Design news feed ranking (Facebook / LinkedIn)", 'L5–L6', 'Meta, LinkedIn, social platforms', 0],
  [210, "Design ad click-through-rate (CTR) prediction", 'L6', 'Google, Meta, Amazon ad platforms', 0],
  [211, "Design music / playlist recommendations (Discover Weekly)", 'L5–L6', 'Spotify, Apple Music, audio platforms', 0],
  [212, "Design “People You May Know” friend recommendations", 'L5–L6', 'Meta, LinkedIn', 0],
  [213, "Design personalized push-notification ranking", 'L5–L6', 'Meta, LinkedIn, consumer apps', 0],
  [214, "Design job recommendations", 'L5–L6', 'LinkedIn, Indeed, marketplace platforms', 0],
  [215, "Design marketplace listing ranking (Airbnb / Etsy)", 'L6', 'Airbnb, Etsy, eBay, marketplace platforms', 0],

  // Search & Retrieval
  [216, "Design search ranking (learning to rank)", 'L6', 'Google, Amazon, LinkedIn, search roles', 3],
  [217, "Design query understanding and autocomplete", 'L5–L6', 'Google, Amazon, search roles', 3],
  [218, "Design semantic search with embeddings (dense retrieval)", 'L6', 'OpenAI, Google, modern search roles', 3],
  [219, "Design visual search (Pinterest Lens / Google Lens)", 'L6', 'Pinterest, Google, Amazon', 3],

  // Prediction & Forecasting
  [223, "Design ETA prediction for deliveries / rides", 'L5–L6', 'Uber, DoorDash, Lyft, logistics platforms', 4],
  [224, "Design demand forecasting and surge pricing", 'L6', 'Uber, Lyft, Amazon, marketplace platforms', 4],
  [225, "Design a dynamic pricing model", 'L6', 'Airbnb, Uber, e-commerce and travel platforms', 4],
  [226, "Design a churn prediction system", 'L5', 'Netflix, Spotify, SaaS companies', 4],
  [227, "Design customer lifetime value (LTV) prediction", 'L5–L6', 'Amazon, consumer subscription companies', 4],

  // NLP & LLM Systems
  [228, "Design a retrieval-augmented generation (RAG) system", 'L6', 'OpenAI, Anthropic, enterprise AI roles', 5],
  [229, "Design an LLM-powered customer support assistant", 'L5–L6', 'OpenAI, Anthropic, SaaS platforms', 5],
  [230, "Design an AI coding assistant (Copilot-style)", 'L6', 'GitHub, Anthropic, OpenAI, developer-tools companies', 5],
  [231, "Design an LLM fine-tuning pipeline", 'L6', 'OpenAI, Anthropic, Meta, ML platform roles', 5],
  [232, "Design an evaluation harness for LLM quality", 'L6', 'OpenAI, Anthropic, Google, AI eval roles', 5],
  [233, "Design a machine translation system", 'L6', 'Google, Meta, Microsoft', 5],
  [234, "Design large-scale text summarization", 'L5–L6', 'Google, Meta, news and productivity platforms', 5],

  // Computer Vision
  [235, "Design image tagging / auto-classification (Google Photos)", 'L5–L6', 'Google, Apple, Meta', 6],
  [236, "Design object detection for autonomous driving", 'L6', 'Waymo, Tesla, Cruise, AV companies', 6],
  [237, "Design OCR / document understanding", 'L5–L6', 'Google, Amazon, fintech and document platforms', 6],
  [238, "Design face verification / identity matching", 'L6', 'Apple, Meta, identity and security roles', 6],

  // ML Platform & Serving
  [206, "Design a distributed model training system", 'L6', 'OpenAI, Anthropic, Google, ML infrastructure roles', 2],
  [207, "Design a feature store for a large-scale ML platform", 'L6', 'Uber, Airbnb, ML platform roles', 2],
  [208, "Design a model serving system at millions of requests per second", 'L6', 'OpenAI, Anthropic, Meta, ML infrastructure roles', 2],
  [239, "Design a real-time streaming feature pipeline", 'L6', 'Uber, DoorDash, ML platform roles', 2],
  [240, "Design a data-labeling / annotation platform", 'L5–L6', 'Scale AI, Tesla, ML operations roles', 2],
  [241, "Design GPU cluster scheduling for training jobs", 'L6–L7', 'OpenAI, Anthropic, Meta, ML infrastructure roles', 2],
  [242, "Design a model registry and metadata store", 'L5–L6', 'ML platform roles, broadly asked', 2],
  [243, "Design an embedding store / vector index serving layer", 'L6', 'OpenAI, Pinecone, AI infrastructure roles', 2],

  // Experimentation & Monitoring
  [244, "Design model monitoring and drift detection", 'L6', 'Meta, Netflix, ML platform roles', 7],
  [245, "Design an A/B testing platform for ML models", 'L6', 'Netflix, Airbnb, Meta, experimentation roles', 7],
  [246, "Design an online / continual learning pipeline", 'L6–L7', 'TikTok, Meta, ML platform roles', 7],
];

// ── System Design Patterns ────────────────────────────────────────────────────
// Source: hellointerview.com "Patterns" section. These are cross-cutting
// techniques rather than interview questions — you don't get asked "design
// scaling reads", you apply it inside another answer. Kept in their own
// category so they stay trackable without inflating the question count.

const PATTERNS_CATEGORY = 'System Design Patterns';

const PATTERN_ARCHETYPES = [
  { name: 'Core Patterns', probe: 'Cross-cutting techniques that recur across archetypes — recognise which one a question is really testing.' },
];

// Numbered from 301. No level/company tags — patterns aren't leveled.
const PATTERN_QUESTIONS = [
  [301, "Real-time Updates", '', '', 0],
  [302, "Dealing with Contention", '', '', 0],
  [303, "Multi-step Processes", '', '', 0],
  [304, "Scaling Reads", '', '', 0],
  [305, "Scaling Writes", '', '', 0],
  [306, "Handling Large Blobs", '', '', 0],
  [307, "Managing Long Running Tasks", '', '', 0],
];

// ── Low Level Design ──────────────────────────────────────────────────────────
// Source: hellointerview.com low-level-design section.
// LLD probes a different axis than system design — class modelling, OOP
// principles, design patterns, and thread safety rather than distributed
// architecture — so problems that also appear in the System Design bank
// (parking lot, rate limiter, ticket booking) are intentionally repeated here.
// Foundations and concurrency topics are archetypes inside this category rather
// than a separate one: unlike the 7 cross-cutting system-design patterns, they
// are small and specific to LLD.

const LLD_CATEGORY = 'Low Level Design';

const LLD_ARCHETYPES = [
  { name: 'Object Design Problems', probe: 'Class modelling and responsibilities. Extensibility. State machines and invariants.' },
  { name: 'Foundations',            probe: 'SOLID, OOP fundamentals, and the design-pattern vocabulary an interviewer expects you to name.' },
  { name: 'Concurrency',            probe: 'Shared mutable state. Locking and signalling. Bounded resources under contention.' },
];

// Numbered from 401. The source lists no difficulty labels, so levels are left
// blank rather than invented.
const LLD_QUESTIONS = [
  [401, "Design Connect Four", '', 'broadly asked', 0],
  [402, "Design an Amazon Locker system", '', 'Amazon, broadly asked', 0],
  [403, "Design an elevator system", '', 'broadly asked', 0],
  [404, "Design a parking lot", '', 'broadly asked (the LLD classic)', 0],
  [405, "Design a file system", '', 'broadly asked', 0],
  [406, "Design a movie ticket booking system", '', 'broadly asked', 0],
  [407, "Design a logging service", '', 'broadly asked', 0],
  [408, "Design a rate limiter (object-level)", '', 'broadly asked', 0],
  [409, "Design an inventory management system", '', 'Amazon, e-commerce companies', 0],

  [410, "Delivery framework for LLD answers", '', '', 1],
  [411, "Design principles (SOLID)", '', '', 1],
  [412, "OOP concepts", '', '', 1],
  [413, "Design patterns", '', '', 1],

  [414, "Concurrency: correctness", '', '', 2],
  [415, "Concurrency: coordination", '', '', 2],
  [416, "Concurrency: scarcity", '', '', 2],
];

// Every seeded bank: one category, its own archetypes, its own questions.
const BANKS = [
  { category: SEED_CATEGORY,     archetypes: ARCHETYPES,         questions: QUESTIONS },
  { category: ML_CATEGORY,       archetypes: ML_ARCHETYPES,      questions: ML_QUESTIONS },
  { category: LLD_CATEGORY,      archetypes: LLD_ARCHETYPES,     questions: LLD_QUESTIONS },
  { category: PATTERNS_CATEGORY, archetypes: PATTERN_ARCHETYPES, questions: PATTERN_QUESTIONS },
];

module.exports = {
  ARCHETYPES, QUESTIONS, SEED_CATEGORY,
  ML_CATEGORY, ML_ARCHETYPES, ML_QUESTIONS,
  LLD_CATEGORY, LLD_ARCHETYPES, LLD_QUESTIONS,
  PATTERNS_CATEGORY, PATTERN_ARCHETYPES, PATTERN_QUESTIONS,
  BANKS, CATEGORIES,
};
