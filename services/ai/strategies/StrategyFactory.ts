
import { BusinessInfo, WebsiteType } from '../../../types';
import { ContentStrategy } from './types';
import { BaseStrategy } from './BaseStrategy';
import { EcommerceStrategy } from './EcommerceStrategy';
import { SaasStrategy } from './SaasStrategy';
import { ServiceStrategy } from './ServiceStrategy';
import { InformationalStrategy } from './InformationalStrategy';
import { AffiliateStrategy } from './AffiliateStrategy';

export class StrategyFactory {
    static getStrategy(info: BusinessInfo): ContentStrategy {
        const type = info.websiteType || 'INFORMATIONAL'; // Default fallback

        switch (type) {
            case 'ECOMMERCE':
                return new EcommerceStrategy(info);
            case 'SAAS':
                return new SaasStrategy(info);
            case 'SERVICE_B2B':
                return new ServiceStrategy(info);
            case 'INFORMATIONAL':
                return new InformationalStrategy(info);
            case 'AFFILIATE_REVIEW':
                return new AffiliateStrategy(info);
            default:
                return new BaseStrategy(info);
        }
    }
}
