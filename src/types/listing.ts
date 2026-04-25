export interface DesignSize {
    id: string;
    name: string;
    thumbnail_path?: string;
    fulfillment_size?: string;
    sell_price_cents?: number;
}

export interface DesignGroup {
    id: string;
    name: string;
    sizes: DesignSize[];
}
