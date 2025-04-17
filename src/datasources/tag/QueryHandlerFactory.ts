import { CurrentQueryHandler } from "./CurrentQueryHandler";
import { HistoricalQueryHandler } from "./HistoricalQueryHandler";
import { PostFn, QueryHandler, TagQueryType } from "./types";

export class QueryHandlerFactory {
    constructor(private post: PostFn, private baseUrl?: string) {}

    public createQueryHandler(queryType: TagQueryType): QueryHandler {
        switch (queryType) {
            case TagQueryType.Current:
                return new CurrentQueryHandler();
            case TagQueryType.History:
                return new HistoricalQueryHandler(this.post, this.baseUrl);
            default:
                throw new Error(`Unsupported query type: ${queryType}`);
        }
    }
}