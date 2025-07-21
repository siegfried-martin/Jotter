// src/lib/services/navigationService.ts
import { goto } from '$app/navigation';
import { CollectionService } from './collectionService';
import { UserService } from './userService';
import type { Collection } from '$lib/types';

export class NavigationService {
  /**
   * Redirect user to their last visited collection
   * If no last visited collection exists, return false (stay on /app page)
   */
  static async redirectToLastVisited(): Promise<boolean> {
    try {
      const lastVisitedId = await UserService.getLastVisitedCollectionId();
      
      if (lastVisitedId) {
        // Verify the collection still exists and user has access
        const userCollections = await CollectionService.getCollections();
        const lastVisited = userCollections.find(c => c.id === lastVisitedId);
        
        if (lastVisited) {
          goto(`/app/collections/${lastVisitedId}`, { replaceState: true });
          return true;
        }
        
        // Last visited collection no longer exists, clear it from preferences
        console.log('Last visited collection no longer exists, clearing from preferences');
        // Note: We could clear the preference here, but it's not critical
      }
      
      // No valid last visited collection - don't redirect, let user stay on /app
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
   * Navigate to create a new collection
   * If user has collections, go to the first one with create dialog
   * If user has no collections, go to /app page to create first one
   */
  static async navigateToCreateCollection(): Promise<void> {
    try {
      const collections = await CollectionService.getCollections();
      
      if (collections.length > 0) {
        // Has collections - go to first one with create dialog
        const firstCollection = collections[0];
        goto(`/app/collections/${firstCollection.id}?create=true`);
      } else {
        // No collections - go to /app page to create first one
        goto('/app');
      }
    } catch (error) {
      console.error('Failed to navigate to create collection:', error);
      // Fallback to /app page
      goto('/app');
    }
  }

  /**
   * Trigger collection creation from anywhere in the app
   */
  static triggerCollectionCreate(): void {
    window.dispatchEvent(new CustomEvent('triggerCollectionCreate'));
  }
}