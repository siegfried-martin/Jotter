// src/lib/services/navigationService.ts
import { goto } from '$app/navigation';
import { CollectionService } from './collectionService';
import { UserService } from './userService';
import type { Collection } from './collectionService';

export class NavigationService {
  /**
   * Redirect user to their last visited collection or a sensible default
   */
  static async redirectToLastVisited(): Promise<boolean> {
    try {
      const lastVisitedId = await UserService.getLastVisitedCollectionId();
      
      if (lastVisitedId) {
        // Verify the collection still exists
        const userCollections = await CollectionService.getCollections();
        const lastVisited = userCollections.find(c => c.id === lastVisitedId);
        
        if (lastVisited) {
          goto(`/app/collections/${lastVisitedId}`, { replaceState: true });
          return true;
        }
      }
      
      // Fall back to default collection
      const userCollections = await CollectionService.getCollections();
      const defaultCollection = userCollections.find(c => c.is_default) || userCollections[0];
      
      if (defaultCollection) {
        goto(`/app/collections/${defaultCollection.id}`, { replaceState: true });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to redirect to last visited collection:', error);
      return false;
    }
  }

  /**
   * Navigate to a specific collection
   */
  static navigateToCollection(collection: Collection): void {
    goto(`/app/collections/${collection.id}`);
  }

  /**
   * Navigate to first collection and trigger creation dialog
   */
  static async navigateToCreateCollection(): Promise<void> {
    try {
      const collections = await CollectionService.getCollections();
      const defaultCollection = collections.find(c => c.is_default) || collections[0];
      
      if (defaultCollection) {
        goto(`/app/collections/${defaultCollection.id}?create=true`);
      }
    } catch (error) {
      console.error('Failed to navigate to create collection:', error);
    }
  }

  /**
   * Trigger collection creation from anywhere in the app
   */
  static triggerCollectionCreate(): void {
    window.dispatchEvent(new CustomEvent('triggerCollectionCreate'));
  }
}