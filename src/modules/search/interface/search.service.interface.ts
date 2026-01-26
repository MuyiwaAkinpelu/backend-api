export interface SearchServiceInterface<T> {
  insertIndex(bulkData: T): Promise<T>;

  updateIndex(updateData: T): Promise<T>;

  searchIndex(searchData: any): Promise<any>;
  suggest(suggestData: any): Promise<any>;
  deleteIndex(indexData: any): Promise<any>;

  deleteDocument(indexData: T): Promise<T>;
}
