export class SearchConfig {
  public static searchConfig(url: string): any {
    return {
      node: url,
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      },
      maxRetries: 5,
      requestTimeout: 60000,
      sniffOnStart: true,
    };
  }
}
