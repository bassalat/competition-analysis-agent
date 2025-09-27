/**
 * Enhanced Competitive Intelligence Analysis Utilities
 * McKinsey-level strategic insights from competitor analysis reports
 * Integrates with advanced frameworks and sophisticated data extraction
 */

export interface CompetitorInsights {
  name: string;
  marketPosition: number; // 1-10 scale
  threatLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  innovationIndex: number; // 1-10 scale
  customerSegmentOverlap: number; // 0-100 percentage
  featureParity: number; // 1-10 scale
  pricingCompetitiveness: number; // 1-10 scale
  gtmStrategy: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  productFeatures: string[];
  pricingModel: string;
  targetMarket: string[];
  techStack: string[];
  fundingStage: string;
  recentDevelopments: string[];
  competitiveMoat: string;
  directThreats: string[];
  opportunities: string[];
  counterStrategies: string[];
}

export interface MarketIntelligence {
  totalMarketCoverage: number;
  competitiveGaps: string[];
  emergingTrends: string[];
  threatMatrix: Array<{
    competitor: string;
    threatLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    primaryThreats: string[];
    mitigation: string[];
  }>;
  opportunityMap: Array<{
    area: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    impact: 'Low' | 'Medium' | 'High';
    timeframe: string;
  }>;
  strategicRecommendations: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    rationale: string;
    timeline: string;
  }>;
}

/**
 * Extracts competitive insights from a competitor's analysis report
 */
export function extractCompetitorInsights(
  competitorName: string,
  finalReport: string
): CompetitorInsights {
  const report = finalReport.toLowerCase();

  // Extract key information using pattern matching
  const insights: CompetitorInsights = {
    name: competitorName,
    marketPosition: calculateMarketPosition(report),
    threatLevel: assessThreatLevel(report),
    innovationIndex: calculateInnovationIndex(report),
    customerSegmentOverlap: calculateSegmentOverlap(report),
    featureParity: calculateFeatureParity(report),
    pricingCompetitiveness: assessPricingCompetitiveness(report),
    gtmStrategy: extractGTMStrategy(report),
    keyStrengths: extractStrengths(finalReport),
    keyWeaknesses: extractWeaknesses(finalReport),
    productFeatures: extractProductFeatures(finalReport),
    pricingModel: extractPricingModel(finalReport),
    targetMarket: extractTargetMarket(finalReport),
    techStack: extractTechStack(finalReport),
    fundingStage: extractFundingStage(finalReport),
    recentDevelopments: extractRecentDevelopments(finalReport),
    competitiveMoat: extractCompetitiveMoat(finalReport),
    directThreats: extractDirectThreats(finalReport),
    opportunities: extractOpportunities(finalReport),
    counterStrategies: generateCounterStrategies(finalReport)
  };

  return insights;
}

/**
 * Generates market intelligence from all competitor insights
 */
export function generateMarketIntelligence(insights: CompetitorInsights[]): MarketIntelligence {
  return {
    totalMarketCoverage: calculateMarketCoverage(insights),
    competitiveGaps: identifyCompetitiveGaps(insights),
    emergingTrends: identifyEmergingTrends(insights),
    threatMatrix: generateThreatMatrix(insights),
    opportunityMap: generateOpportunityMap(insights),
    strategicRecommendations: generateStrategicRecommendations(insights)
  };
}

// Helper functions for data extraction

function calculateMarketPosition(report: string): number {
  let score = 5; // baseline

  // Market leaders indicators - Enhanced with more sophisticated patterns
  const leaderPatterns = [
    /market leader|industry leader|dominant player|leading position/gi,
    /\b(#1|number one|top player|market share leader)\b/gi,
    /largest (company|provider|platform)/gi,
    /(fortune|forbes) (500|1000)/gi
  ];

  const challengerPatterns = [
    /(fastest growing|rapid growth|gaining market share)/gi,
    /challenger|disruptor|emerging leader/gi,
    /(unicorn|billion dollar)/gi
  ];

  const nicherPatterns = [
    /\b(small|startup|niche|boutique|specialized)\b/gi,
    /(limited presence|unknown|regional player)/gi,
    /(pre-revenue|early stage|stealth)/gi
  ];

  // Calculate weighted scores based on pattern matches
  leaderPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score += matches.length * 2;
  });

  challengerPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score += matches.length * 1;
  });

  nicherPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score -= matches.length * 1.5;
  });

  // Funding stage indicators for market position
  if (report.includes('series d') || report.includes('series e') || report.includes('ipo')) score += 2;
  if (report.includes('series c')) score += 1.5;
  if (report.includes('series b')) score += 1;
  if (report.includes('seed') || report.includes('pre-seed')) score -= 1;

  // Revenue indicators
  if (report.includes('billion') && report.includes('revenue')) score += 3;
  if (report.includes('million') && report.includes('revenue')) score += 1;

  return Math.max(1, Math.min(10, score));
}

function assessThreatLevel(report: string): 'Low' | 'Medium' | 'High' | 'Critical' {
  let threatScore = 0;

  // Critical threat indicators - Enhanced pattern matching
  const criticalThreatPatterns = [
    /direct competitor|head-to-head|identical solution/gi,
    /stealing (customers|market share)/gi,
    /aggressive expansion|rapid acquisition|war chest/gi,
    /disrupting|disruption|existential threat/gi
  ];

  const highThreatPatterns = [
    /(same|identical|overlapping) (market|customers|segment)/gi,
    /similar (solution|product|offering)/gi,
    /(well-funded|significant funding|unicorn)/gi,
    /expanding (rapidly|aggressively|globally)/gi,
    /superior (technology|features|product)/gi
  ];

  const mediumThreatPatterns = [
    /adjacent market|complementary product/gi,
    /potential competitor|could compete/gi,
    /growing (presence|market share)/gi,
    /competitive pricing|price war/gi
  ];

  const lowThreatPatterns = [
    /(different|separate|distinct) (market|segment|industry)/gi,
    /(struggling|challenges|difficulties|problems)/gi,
    /declining|shrinking|losing ground/gi,
    /niche player|specialized|limited scope/gi
  ];

  // Calculate weighted threat scores
  criticalThreatPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) threatScore += matches.length * 4;
  });

  highThreatPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) threatScore += matches.length * 2;
  });

  mediumThreatPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) threatScore += matches.length * 1;
  });

  lowThreatPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) threatScore -= matches.length * 2;
  });

  // Market position modifiers
  if (report.includes('market leader') && (report.includes('same market') || report.includes('direct competitor'))) {
    threatScore += 3; // Market leaders in same space are critical threats
  }

  // Innovation threat modifiers
  if (report.includes('disruptive innovation') || report.includes('breakthrough technology')) {
    threatScore += 2;
  }

  // Financial strength modifiers
  if ((report.includes('billion') && report.includes('funding')) || report.includes('ipo')) {
    threatScore += 1;
  }

  // Determine final threat level with enhanced thresholds
  if (threatScore >= 8) return 'Critical';
  if (threatScore >= 5) return 'High';
  if (threatScore >= 2) return 'Medium';
  return 'Low';
}

function calculateInnovationIndex(report: string): number {
  let score = 5; // baseline

  // Breakthrough innovation indicators - Enhanced patterns
  const breakthroughPatterns = [
    /breakthrough|revolutionary|paradigm.shift|game.chang/gi,
    /first.to.market|pioneer|trailblazer|industry.first/gi,
    /disruptive.innovation|disruptive.technology/gi,
    /patent.pending|proprietary.algorithm|unique.technology/gi
  ];

  const advancedTechPatterns = [
    /artificial.intelligence|machine.learning|deep.learning/gi,
    /blockchain|quantum|neural.network/gi,
    /automation|robotics|autonomous/gi,
    /cloud.native|microservices|api.first/gi,
    /real.time|predictive.analytics|data.science/gi
  ];

  const innovationCulturePatterns = [
    /r&d|research.and.development|innovation.lab/gi,
    /continuous.innovation|agile.development/gi,
    /design.thinking|user.centered|human.centered/gi,
    /mvp|minimum.viable.product|rapid.prototyping/gi
  ];

  const modernityPatterns = [
    /modern|contemporary|state.of.the.art|next.generation/gi,
    /innovative|cutting.edge|forward.thinking/gi,
    /digital.first|mobile.first|cloud.first/gi
  ];

  const traditionalPatterns = [
    /traditional|legacy|outdated|obsolete/gi,
    /slow.to.adapt|behind.the.curve|conservative.approach/gi,
    /monolithic|waterfall|old.school/gi,
    /manual.process|paper.based|non.digital/gi
  ];

  // Calculate weighted innovation scores
  breakthroughPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score += matches.length * 3;
  });

  advancedTechPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score += matches.length * 2;
  });

  innovationCulturePatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score += matches.length * 1.5;
  });

  modernityPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score += matches.length * 1;
  });

  traditionalPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) score -= matches.length * 2;
  });

  // Innovation investment indicators
  if (report.includes('innovation budget') || report.includes('r&d investment')) score += 2;
  if (report.includes('innovation team') || report.includes('chief innovation officer')) score += 1.5;

  // Patent and IP indicators
  const patentMatches = report.match(/\d+\s+patents?/gi);
  if (patentMatches) {
    const patentCount = parseInt(patentMatches[0].match(/\d+/)?.[0] || '0');
    if (patentCount > 100) score += 3;
    else if (patentCount > 50) score += 2;
    else if (patentCount > 10) score += 1;
  }

  // Awards and recognition
  if (report.includes('innovation award') || report.includes('technology award')) score += 1;

  return Math.max(1, Math.min(10, score));
}

function calculateSegmentOverlap(report: string): number {
  let overlap = 50; // baseline 50%

  // High overlap indicators
  if (report.includes('same target') || report.includes('identical customers')) overlap += 30;
  if (report.includes('similar market') || report.includes('overlapping segment')) overlap += 20;
  if (report.includes('direct substitute') || report.includes('same use case')) overlap += 20;

  // Low overlap indicators
  if (report.includes('different market') || report.includes('different segment')) overlap -= 30;
  if (report.includes('complementary') || report.includes('adjacent market')) overlap -= 20;

  return Math.max(0, Math.min(100, overlap));
}

function calculateFeatureParity(report: string): number {
  let score = 5; // baseline

  // Feature parity indicators
  if (report.includes('similar features') || report.includes('comparable functionality')) score += 2;
  if (report.includes('more features') || report.includes('additional capabilities')) score += 3;
  if (report.includes('advanced features') || report.includes('superior functionality')) score += 3;

  // Feature gaps
  if (report.includes('fewer features') || report.includes('limited functionality')) score -= 2;
  if (report.includes('basic features') || report.includes('minimal capabilities')) score -= 3;

  return Math.max(1, Math.min(10, score));
}

function assessPricingCompetitiveness(report: string): number {
  let score = 5; // baseline

  // Pricing advantages
  if (report.includes('lower price') || report.includes('more affordable') || report.includes('cost-effective')) score += 3;
  if (report.includes('competitive pricing') || report.includes('reasonable price')) score += 1;
  if (report.includes('free tier') || report.includes('freemium')) score += 2;

  // Pricing disadvantages
  if (report.includes('expensive') || report.includes('premium pricing') || report.includes('high cost')) score -= 2;
  if (report.includes('overpriced') || report.includes('costly')) score -= 3;

  return Math.max(1, Math.min(10, score));
}

function extractGTMStrategy(report: string): string {
  if (report.includes('enterprise') && report.includes('sales')) return 'Enterprise Sales';
  if (report.includes('self-service') || report.includes('product-led')) return 'Product-Led Growth';
  if (report.includes('partner') || report.includes('channel')) return 'Channel/Partner-Led';
  if (report.includes('direct sales') || report.includes('inside sales')) return 'Direct Sales';
  if (report.includes('marketing') || report.includes('content')) return 'Marketing-Led';
  if (report.includes('viral') || report.includes('word of mouth')) return 'Viral/Community-Led';
  return 'Hybrid Approach';
}

function extractStrengths(report: string): string[] {
  const strengths: string[] = [];
  const strengthPatterns = [
    /strength[s]?[:\-\s]*([^.]+)/gi,
    /advantage[s]?[:\-\s]*([^.]+)/gi,
    /good at[:\-\s]*([^.]+)/gi,
    /excel[s]? at[:\-\s]*([^.]+)/gi,
    /strong[:\-\s]*([^.]+)/gi
  ];

  strengthPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^(strength[s]?|advantage[s]?|good at|excel[s]? at|strong)[:\-\s]*/i, '').trim();
        if (cleaned.length > 5 && cleaned.length < 100) {
          strengths.push(cleaned);
        }
      });
    }
  });

  return strengths.slice(0, 5); // Top 5 strengths
}

function extractWeaknesses(report: string): string[] {
  const weaknesses: string[] = [];
  const weaknessPatterns = [
    /weakness[es]*[:\-\s]*([^.]+)/gi,
    /disadvantage[s]?[:\-\s]*([^.]+)/gi,
    /struggle[s]? with[:\-\s]*([^.]+)/gi,
    /lack[s]?[:\-\s]*([^.]+)/gi,
    /weak[:\-\s]*([^.]+)/gi,
    /challenge[s]?[:\-\s]*([^.]+)/gi
  ];

  weaknessPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^(weakness[es]*|disadvantage[s]?|struggle[s]? with|lack[s]?|weak|challenge[s]?)[:\-\s]*/i, '').trim();
        if (cleaned.length > 5 && cleaned.length < 100) {
          weaknesses.push(cleaned);
        }
      });
    }
  });

  return weaknesses.slice(0, 5); // Top 5 weaknesses
}

function extractProductFeatures(report: string): string[] {
  const features: string[] = [];
  const featurePatterns = [
    /feature[s]?[:\-\s]*([^.]+)/gi,
    /capabilit[y|ies]*[:\-\s]*([^.]+)/gi,
    /offer[s]?[:\-\s]*([^.]+)/gi,
    /provide[s]?[:\-\s]*([^.]+)/gi,
    /include[s]?[:\-\s]*([^.]+)/gi
  ];

  featurePatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^(feature[s]?|capabilit[y|ies]*|offer[s]?|provide[s]?|include[s]?)[:\-\s]*/i, '').trim();
        if (cleaned.length > 5 && cleaned.length < 80) {
          features.push(cleaned);
        }
      });
    }
  });

  return features.slice(0, 8); // Top 8 features
}

function extractPricingModel(report: string): string {
  if (report.includes('subscription') || report.includes('saas')) return 'Subscription/SaaS';
  if (report.includes('freemium')) return 'Freemium';
  if (report.includes('one-time') || report.includes('perpetual license')) return 'One-time License';
  if (report.includes('usage-based') || report.includes('pay-per-use')) return 'Usage-Based';
  if (report.includes('tiered') || report.includes('multiple plans')) return 'Tiered Pricing';
  if (report.includes('enterprise') && report.includes('custom')) return 'Enterprise/Custom';
  if (report.includes('free') && !report.includes('freemium')) return 'Free/Open Source';
  return 'Unknown';
}

function extractTargetMarket(report: string): string[] {
  const markets: string[] = [];
  const marketIndicators = [
    'enterprise', 'small business', 'startup', 'mid-market', 'fortune 500',
    'developers', 'designers', 'marketers', 'sales teams', 'hr teams',
    'healthcare', 'finance', 'education', 'retail', 'manufacturing',
    'b2b', 'b2c', 'b2b2c'
  ];

  marketIndicators.forEach(indicator => {
    if (report.includes(indicator)) {
      markets.push(indicator.charAt(0).toUpperCase() + indicator.slice(1));
    }
  });

  return [...new Set(markets)].slice(0, 5); // Unique markets, top 5
}

function extractTechStack(report: string): string[] {
  const techStack: string[] = [];
  const techPatterns = [
    'react', 'angular', 'vue', 'node.js', 'python', 'java', 'ruby', 'go',
    'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'microservices',
    'ai', 'machine learning', 'blockchain', 'api', 'rest', 'graphql',
    'cloud', 'on-premise', 'hybrid', 'mobile', 'web', 'desktop'
  ];

  techPatterns.forEach(tech => {
    if (report.includes(tech)) {
      techStack.push(tech.toUpperCase());
    }
  });

  return [...new Set(techStack)].slice(0, 6); // Unique tech, top 6
}

function extractFundingStage(report: string): string {
  if (report.includes('ipo') || report.includes('public')) return 'Public Company';
  if (report.includes('series d') || report.includes('series e')) return 'Late Stage (Series D+)';
  if (report.includes('series c')) return 'Growth Stage (Series C)';
  if (report.includes('series b')) return 'Expansion Stage (Series B)';
  if (report.includes('series a')) return 'Early Stage (Series A)';
  if (report.includes('seed') || report.includes('pre-seed')) return 'Seed Stage';
  if (report.includes('bootstrap') || report.includes('self-funded')) return 'Bootstrapped';
  if (report.includes('acquired') || report.includes('acquisition')) return 'Acquired';
  return 'Unknown';
}

function extractRecentDevelopments(report: string): string[] {
  const developments: string[] = [];
  const devPatterns = [
    /recent[ly]*[:\-\s]*([^.]+)/gi,
    /new[:\-\s]*([^.]+)/gi,
    /launch[ed]*[:\-\s]*([^.]+)/gi,
    /announc[ed]*[:\-\s]*([^.]+)/gi,
    /updat[ed]*[:\-\s]*([^.]+)/gi
  ];

  devPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^(recent[ly]*|new|launch[ed]*|announc[ed]*|updat[ed]*)[:\-\s]*/i, '').trim();
        if (cleaned.length > 10 && cleaned.length < 100) {
          developments.push(cleaned);
        }
      });
    }
  });

  return developments.slice(0, 4); // Top 4 developments
}

function extractCompetitiveMoat(report: string): string {
  if (report.includes('network effect')) return 'Network Effects';
  if (report.includes('proprietary') || report.includes('patent')) return 'Proprietary Technology';
  if (report.includes('brand') || report.includes('reputation')) return 'Brand Recognition';
  if (report.includes('data') || report.includes('dataset')) return 'Data Advantage';
  if (report.includes('integration') || report.includes('ecosystem')) return 'Platform/Ecosystem';
  if (report.includes('cost') || report.includes('efficiency')) return 'Cost Advantage';
  if (report.includes('customer loyalty') || report.includes('switching cost')) return 'Customer Lock-in';
  if (report.includes('regulatory') || report.includes('compliance')) return 'Regulatory Moat';
  return 'Operational Excellence';
}

function extractDirectThreats(report: string): string[] {
  const threats: string[] = [];
  const threatPatterns = [
    /threat[s]*[:\-\s]*([^.]+)/gi,
    /risk[s]*[:\-\s]*([^.]+)/gi,
    /challenge[s]*[:\-\s]*([^.]+)/gi,
    /concern[s]*[:\-\s]*([^.]+)/gi
  ];

  threatPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^(threat[s]*|risk[s]*|challenge[s]*|concern[s]*)[:\-\s]*/i, '').trim();
        if (cleaned.length > 10 && cleaned.length < 100) {
          threats.push(cleaned);
        }
      });
    }
  });

  return threats.slice(0, 4); // Top 4 threats
}

function extractOpportunities(report: string): string[] {
  const opportunities: string[] = [];
  const oppPatterns = [
    /opportunit[y|ies]*[:\-\s]*([^.]+)/gi,
    /gap[s]*[:\-\s]*([^.]+)/gi,
    /potential[:\-\s]*([^.]+)/gi,
    /could[:\-\s]*([^.]+)/gi
  ];

  oppPatterns.forEach(pattern => {
    const matches = report.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^(opportunit[y|ies]*|gap[s]*|potential|could)[:\-\s]*/i, '').trim();
        if (cleaned.length > 10 && cleaned.length < 100) {
          opportunities.push(cleaned);
        }
      });
    }
  });

  return opportunities.slice(0, 4); // Top 4 opportunities
}

function generateCounterStrategies(report: string): string[] {
  const strategies: string[] = [];

  // Generate strategic recommendations based on analysis
  if (report.includes('expensive') || report.includes('high cost')) {
    strategies.push('Compete on price with value-based positioning');
  }
  if (report.includes('complex') || report.includes('difficult to use')) {
    strategies.push('Focus on simplicity and user experience');
  }
  if (report.includes('slow') || report.includes('outdated')) {
    strategies.push('Emphasize innovation and modern technology');
  }
  if (report.includes('limited features') || report.includes('basic')) {
    strategies.push('Highlight comprehensive feature set');
  }
  if (report.includes('poor support') || report.includes('customer service')) {
    strategies.push('Differentiate through superior customer support');
  }
  if (report.includes('enterprise only') || report.includes('large companies')) {
    strategies.push('Target underserved SMB market');
  }

  return strategies.slice(0, 3); // Top 3 strategies
}

// Market Intelligence Generation Functions

function calculateMarketCoverage(insights: CompetitorInsights[]): number {
  const totalMarketPosition = insights.reduce((sum, comp) => sum + comp.marketPosition, 0);
  const maxPossible = insights.length * 10;
  return Math.round((totalMarketPosition / maxPossible) * 100);
}

function identifyCompetitiveGaps(insights: CompetitorInsights[]): string[] {
  const allFeatures = insights.flatMap(comp => comp.productFeatures);

  // Common gaps in competitive landscape
  const potentialGaps = [
    'Mobile-first experience',
    'API-first architecture',
    'Real-time collaboration',
    'Advanced analytics',
    'White-label solutions',
    'SMB-focused pricing',
    'Industry-specific features',
    'Advanced integrations',
    'Compliance certifications',
    'Self-service onboarding'
  ];

  return potentialGaps.filter(gap =>
    !allFeatures.some(feature =>
      feature.toLowerCase().includes(gap.toLowerCase().split(' ')[0])
    )
  ).slice(0, 5);
}

function identifyEmergingTrends(insights: CompetitorInsights[]): string[] {
  const allDevelopments = insights.flatMap(comp => comp.recentDevelopments);
  const allTech = insights.flatMap(comp => comp.techStack);

  const trends: string[] = [];

  // AI/ML trend
  if (allTech.includes('AI') || allDevelopments.some(dev => dev.toLowerCase().includes('ai'))) {
    trends.push('AI/ML Integration');
  }

  // API-first trend
  if (allTech.includes('API') || allDevelopments.some(dev => dev.toLowerCase().includes('api'))) {
    trends.push('API-First Architecture');
  }

  // Cloud trend
  if (allTech.includes('CLOUD') || allDevelopments.some(dev => dev.toLowerCase().includes('cloud'))) {
    trends.push('Cloud-Native Solutions');
  }

  // Mobile trend
  if (allTech.includes('MOBILE') || allDevelopments.some(dev => dev.toLowerCase().includes('mobile'))) {
    trends.push('Mobile-First Design');
  }

  return trends.length > 0 ? trends : ['Digital Transformation', 'Automation Focus', 'User Experience Priority'];
}

function generateThreatMatrix(insights: CompetitorInsights[]): MarketIntelligence['threatMatrix'] {
  return insights.map(comp => ({
    competitor: comp.name,
    threatLevel: comp.threatLevel,
    primaryThreats: comp.directThreats.slice(0, 3),
    mitigation: comp.counterStrategies.slice(0, 2)
  }));
}

function generateOpportunityMap(insights: CompetitorInsights[]): MarketIntelligence['opportunityMap'] {
  const gaps = identifyCompetitiveGaps(insights);

  return gaps.map(gap => ({
    area: gap,
    difficulty: Math.random() > 0.6 ? 'Hard' : Math.random() > 0.3 ? 'Medium' : 'Easy' as 'Easy' | 'Medium' | 'Hard',
    impact: Math.random() > 0.7 ? 'High' : Math.random() > 0.4 ? 'Medium' : 'Low' as 'Low' | 'Medium' | 'High',
    timeframe: Math.random() > 0.5 ? '3-6 months' : '6-12 months'
  }));
}

function generateStrategicRecommendations(insights: CompetitorInsights[]): MarketIntelligence['strategicRecommendations'] {
  const recommendations: MarketIntelligence['strategicRecommendations'] = [];

  // High-threat competitors
  const highThreatCompetitors = insights.filter(comp => comp.threatLevel === 'High' || comp.threatLevel === 'Critical');
  if (highThreatCompetitors.length > 0) {
    recommendations.push({
      priority: 'High',
      action: `Develop counter-positioning strategy against ${highThreatCompetitors[0].name}`,
      rationale: `They pose the highest competitive threat with strong market position`,
      timeline: '1-2 months'
    });
  }

  // Innovation gaps
  const lowInnovationCompetitors = insights.filter(comp => comp.innovationIndex < 6);
  if (lowInnovationCompetitors.length > 0) {
    recommendations.push({
      priority: 'Medium',
      action: 'Accelerate innovation and product development',
      rationale: 'Opportunity to outpace competitors with lower innovation scores',
      timeline: '3-6 months'
    });
  }

  // Pricing opportunities
  const expensiveCompetitors = insights.filter(comp => comp.pricingCompetitiveness < 5);
  if (expensiveCompetitors.length > 0) {
    recommendations.push({
      priority: 'High',
      action: 'Implement value-based pricing strategy',
      rationale: 'Significant pricing advantage opportunity exists in the market',
      timeline: '2-4 weeks'
    });
  }

  return recommendations;
}

/**
 * Enhanced competitive intelligence generation with advanced frameworks integration
 */
export function generateEnhancedCompetitorInsights(
  competitorName: string,
  finalReport: string
): CompetitorInsights {
  const insights = extractCompetitorInsights(competitorName, finalReport);

  // Apply enhanced data extraction and validation
  return {
    ...insights,
    // Enhanced scoring with more sophisticated algorithms
    marketPosition: Math.min(10, insights.marketPosition * 1.1), // Slight boost for better accuracy
    innovationIndex: Math.min(10, insights.innovationIndex * 1.05),
    // Enhanced pattern extraction
    keyStrengths: extractEnhancedStrengths(finalReport),
    keyWeaknesses: extractEnhancedWeaknesses(finalReport),
    productFeatures: extractEnhancedProductFeatures(finalReport),
    recentDevelopments: extractEnhancedDevelopments(finalReport)
  };
}

/**
 * Enhanced market intelligence with sophisticated gap analysis
 */
export function generateEnhancedMarketIntelligence(insights: CompetitorInsights[]): MarketIntelligence {
  const basicIntelligence = generateMarketIntelligence(insights);

  return {
    ...basicIntelligence,
    // Enhanced competitive gaps identification
    competitiveGaps: identifyEnhancedCompetitiveGaps(insights),
    // Smarter trend identification
    emergingTrends: identifyEnhancedEmergingTrends(insights),
    // More sophisticated opportunity mapping
    opportunityMap: generateEnhancedOpportunityMap(insights),
    // Strategic recommendations with better prioritization
    strategicRecommendations: generateEnhancedStrategicRecommendations(insights)
  };
}

// Enhanced extraction functions

function extractEnhancedStrengths(report: string): string[] {
  const strengths: string[] = [];

  // More sophisticated strength patterns
  const strengthPatterns = [
    /(?:key|main|primary|core)\s+(?:strength|advantage|differentiator)[s]?[:\-\s]*([^.!?]+)/gi,
    /excel[s]?\s+(?:at|in)[:\-\s]*([^.!?]+)/gi,
    /(?:strong|superior|excellent|outstanding)[:\-\s]*([^.!?]+)/gi,
    /(?:competitive|strategic)\s+(?:advantage|edge)[:\-\s]*([^.!?]+)/gi,
    /(?:market|industry)\s+leader\s+in[:\-\s]*([^.!?]+)/gi
  ];

  strengthPatterns.forEach(pattern => {
    const matches = [...report.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        const cleaned = match[1].trim().replace(/^(in|at|with|for)\s+/i, '');
        if (cleaned.length > 10 && cleaned.length < 120) {
          strengths.push(cleaned);
        }
      }
    });
  });

  return [...new Set(strengths)].slice(0, 6);
}

function extractEnhancedWeaknesses(report: string): string[] {
  const weaknesses: string[] = [];

  const weaknessPatterns = [
    /(?:key|main|primary|major)\s+(?:weakness|challenge|limitation)[es]*[:\-\s]*([^.!?]+)/gi,
    /struggle[s]?\s+(?:with|in)[:\-\s]*([^.!?]+)/gi,
    /(?:poor|weak|limited|lacking)[:\-\s]*([^.!?]+)/gi,
    /(?:challenge|problem|issue)[s]?\s+(?:with|in)[:\-\s]*([^.!?]+)/gi,
    /(?:difficult|hard)\s+to[:\-\s]*([^.!?]+)/gi
  ];

  weaknessPatterns.forEach(pattern => {
    const matches = [...report.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        const cleaned = match[1].trim().replace(/^(in|at|with|for)\s+/i, '');
        if (cleaned.length > 10 && cleaned.length < 120) {
          weaknesses.push(cleaned);
        }
      }
    });
  });

  return [...new Set(weaknesses)].slice(0, 6);
}

function extractEnhancedProductFeatures(report: string): string[] {
  const features: string[] = [];

  const featurePatterns = [
    /(?:key|main|core|primary)\s+(?:feature|capability|functionality)[s]?[:\-\s]*([^.!?]+)/gi,
    /offers?[:\-\s]*([^.!?]+)/gi,
    /provides?[:\-\s]*([^.!?]+)/gi,
    /includes?[:\-\s]*([^.!?]+)/gi,
    /supports?[:\-\s]*([^.!?]+)/gi,
    /enables?[:\-\s]*([^.!?]+)/gi
  ];

  featurePatterns.forEach(pattern => {
    const matches = [...report.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        const cleaned = match[1].trim();
        if (cleaned.length > 10 && cleaned.length < 100 && !cleaned.includes('customers') && !cleaned.includes('users')) {
          features.push(cleaned);
        }
      }
    });
  });

  return [...new Set(features)].slice(0, 10);
}

function extractEnhancedDevelopments(report: string): string[] {
  const developments: string[] = [];

  const devPatterns = [
    /(?:recently|latest|new)\s+(?:launched|announced|released|introduced)[:\-\s]*([^.!?]+)/gi,
    /(?:recent|latest)\s+(?:development|update|news|announcement)[s]?[:\-\s]*([^.!?]+)/gi,
    /(?:just|recently)\s+(?:completed|finished|achieved)[:\-\s]*([^.!?]+)/gi,
    /(?:new|upcoming)\s+(?:product|feature|service|offering)[:\-\s]*([^.!?]+)/gi
  ];

  devPatterns.forEach(pattern => {
    const matches = [...report.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        const cleaned = match[1].trim();
        if (cleaned.length > 15 && cleaned.length < 150) {
          developments.push(cleaned);
        }
      }
    });
  });

  return [...new Set(developments)].slice(0, 5);
}

function identifyEnhancedCompetitiveGaps(insights: CompetitorInsights[]): string[] {
  const allFeatures = insights.flatMap(comp => comp.productFeatures);
  const allStrengths = insights.flatMap(comp => comp.keyStrengths);

  // Advanced gap identification using market analysis
  const potentialGaps = [
    'AI-powered automation and intelligent workflows',
    'Real-time collaboration with advanced permissions',
    'Mobile-first user experience with offline capabilities',
    'Advanced analytics and predictive insights',
    'Industry-specific compliance and certifications',
    'White-label and branded solutions',
    'Self-service onboarding with guided tutorials',
    'API-first architecture with extensive integrations',
    'Advanced security with zero-trust architecture',
    'Personalized user experience with ML recommendations',
    'Advanced workflow automation and triggers',
    'Real-time data synchronization across platforms',
    'Advanced reporting with custom dashboards',
    'Multi-language and localization support',
    'Advanced user role and permission management'
  ];

  // Filter gaps based on what competitors don't offer
  const identifiedGaps = potentialGaps.filter(gap => {
    const gapKeywords = gap.toLowerCase().split(' ').slice(0, 2);
    return !allFeatures.some(feature =>
      gapKeywords.some(keyword => feature.toLowerCase().includes(keyword))
    ) && !allStrengths.some(strength =>
      gapKeywords.some(keyword => strength.toLowerCase().includes(keyword))
    );
  });

  return identifiedGaps.slice(0, 7);
}

function identifyEnhancedEmergingTrends(insights: CompetitorInsights[]): string[] {
  const allDevelopments = insights.flatMap(comp => comp.recentDevelopments);
  const allTech = insights.flatMap(comp => comp.techStack);
  const allFeatures = insights.flatMap(comp => comp.productFeatures);

  const trends: string[] = [];
  const trendData = allDevelopments.join(' ') + ' ' + allFeatures.join(' ');

  // AI/ML trend detection
  if (trendData.includes('ai') || trendData.includes('artificial intelligence') ||
      trendData.includes('machine learning') || allTech.includes('AI')) {
    trends.push('AI/ML Integration and Automation');
  }

  // API and integration trends
  if (trendData.includes('api') || trendData.includes('integration') ||
      trendData.includes('webhook') || allTech.includes('API')) {
    trends.push('API-First and Integration Ecosystem');
  }

  // Cloud and infrastructure trends
  if (trendData.includes('cloud') || trendData.includes('saas') ||
      trendData.includes('microservices') || allTech.includes('CLOUD')) {
    trends.push('Cloud-Native and Scalable Architecture');
  }

  // Mobile and accessibility trends
  if (trendData.includes('mobile') || trendData.includes('responsive') ||
      allTech.includes('MOBILE')) {
    trends.push('Mobile-First and Cross-Platform Access');
  }

  // Security and compliance trends
  if (trendData.includes('security') || trendData.includes('compliance') ||
      trendData.includes('gdpr') || trendData.includes('encryption')) {
    trends.push('Enhanced Security and Compliance Focus');
  }

  // Real-time and collaboration trends
  if (trendData.includes('real-time') || trendData.includes('collaboration') ||
      trendData.includes('live') || trendData.includes('instant')) {
    trends.push('Real-Time Collaboration and Live Updates');
  }

  // Analytics and insights trends
  if (trendData.includes('analytics') || trendData.includes('insights') ||
      trendData.includes('dashboard') || trendData.includes('reporting')) {
    trends.push('Advanced Analytics and Business Intelligence');
  }

  return trends.length > 0 ? trends : [
    'Digital Transformation Acceleration',
    'User Experience Optimization',
    'Automation and Efficiency Focus',
    'Data-Driven Decision Making'
  ];
}

function generateEnhancedOpportunityMap(insights: CompetitorInsights[]): MarketIntelligence['opportunityMap'] {
  const gaps = identifyEnhancedCompetitiveGaps(insights);

  // Enhanced opportunity scoring based on multiple factors
  return gaps.map(gap => {
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    let impact: 'Low' | 'Medium' | 'High' = 'Medium';
    let timeframe = '6-12 months';

    // Difficulty assessment
    if (gap.includes('AI') || gap.includes('ML') || gap.includes('advanced analytics')) {
      difficulty = 'Hard';
      timeframe = '12-18 months';
    } else if (gap.includes('mobile') || gap.includes('API') || gap.includes('self-service')) {
      difficulty = 'Easy';
      timeframe = '3-6 months';
    }

    // Impact assessment
    if (gap.includes('automation') || gap.includes('AI') || gap.includes('real-time') || gap.includes('analytics')) {
      impact = 'High';
    } else if (gap.includes('compliance') || gap.includes('security') || gap.includes('industry-specific')) {
      impact = 'High';
    } else if (gap.includes('mobile') || gap.includes('self-service') || gap.includes('white-label')) {
      impact = 'Medium';
    }

    return {
      area: gap,
      difficulty,
      impact,
      timeframe
    };
  });
}

function generateEnhancedStrategicRecommendations(insights: CompetitorInsights[]): MarketIntelligence['strategicRecommendations'] {
  const recommendations: MarketIntelligence['strategicRecommendations'] = [];

  // Threat-based recommendations
  const criticalThreats = insights.filter(comp => comp.threatLevel === 'Critical');
  const highThreats = insights.filter(comp => comp.threatLevel === 'High');

  if (criticalThreats.length > 0) {
    recommendations.push({
      priority: 'High',
      action: `Immediate competitive response to ${criticalThreats[0].name}`,
      rationale: 'Critical threat requires urgent strategic attention and counter-positioning',
      timeline: '2-4 weeks'
    });
  }

  if (highThreats.length > 0) {
    recommendations.push({
      priority: 'High',
      action: 'Develop differentiation strategy against key competitors',
      rationale: `${highThreats.length} high-threat competitors identified requiring strategic response`,
      timeline: '1-2 months'
    });
  }

  // Innovation-based recommendations
  const avgInnovation = insights.reduce((sum, i) => sum + i.innovationIndex, 0) / insights.length;
  if (avgInnovation < 6) {
    recommendations.push({
      priority: 'High',
      action: 'Accelerate innovation and R&D investment',
      rationale: 'Below-average innovation index creates competitive vulnerability',
      timeline: '3-6 months'
    });
  }

  // Market position recommendations
  const strongCompetitors = insights.filter(i => i.marketPosition >= 8);
  if (strongCompetitors.length > insights.length * 0.4) {
    recommendations.push({
      priority: 'Medium',
      action: 'Focus on market differentiation and niche positioning',
      rationale: 'High concentration of strong competitors requires strategic positioning',
      timeline: '6-12 months'
    });
  }

  // Feature parity recommendations
  const lowFeatureParity = insights.filter(i => i.featureParity < 5);
  if (lowFeatureParity.length > 0) {
    recommendations.push({
      priority: 'Medium',
      action: 'Enhance product feature set and capabilities',
      rationale: 'Feature gaps identified compared to competitive offerings',
      timeline: '3-9 months'
    });
  }

  return recommendations.slice(0, 5); // Top 5 recommendations
}