// src/lib/services/navigationService.ts
import { goto } from '$app/navigation';
import { CollectionService } from './collectionService';
import { UserService } from './userService';
import { NoteService } from './noteService';
import type { Collection } from '$lib/types';

export class NavigationService {
  /**
   * Redirect user to their last visited container
   * If no last visited container exists, redirect to last visited collection
   * If no last visited collection exists, return false (stay on /app page)
   */
  static async redirectToLastVisited(): Promise<boolean> {
    try {
      // First try to get the last visited container
      const lastVisitedContainerId = await UserService.getLastVisitedContainerId();
      
      if (lastVisitedContainerId) {
        console.log('🎯 Found last visited container:', lastVisitedContainerId);
        
        // Get which collection this container belongs to
        const containerCollectionId = await UserService.getContainerCollection(lastVisitedContainerId);
        
        if (containerCollectionId) {
          // Verify user still has access to this collection
          const userCollections = await CollectionService.getCollections();
          const collection = userCollections.find(c => c.id === containerCollectionId);
          
          if (collection) {
            // Verify the container still exists in this collection
            const containers = await NoteService.getNoteContainers(containerCollectionId);
            const container = containers.find(c => c.id === lastVisitedContainerId);
            
            if (container) {
              console.log('🚀 Redirecting directly to container:', container.title);
              goto(`/app/collections/${containerCollectionId}/containers/${lastVisitedContainerId}`, { replaceState: true });
              return true;
            } else {
              console.log('⚠️ Last visited container no longer exists in collection');
            }
          } else {
            console.log('⚠️ Collection for last visited container no longer accessible');
          }
        } else {
          console.log('⚠️ Could not find collection for last visited container');
        }
      }
      
      // Fallback: Try to redirect to last visited collection
      console.log('🔄 Falling back to last visited collection');
      const lastVisitedCollectionId = await UserService.getLastVisitedCollectionId();
      
      if (lastVisitedCollectionId) {
        // Verify the collection still exists and user has access
        const userCollections = await CollectionService.getCollections();
        const lastVisitedCollection = userCollections.find(c => c.id === lastVisitedCollectionId);
        
        if (lastVisitedCollection) {
          console.log('🚀 Redirecting to collection:', lastVisitedCollection.name);
          goto(`/app/collections/${lastVisitedCollectionId}`, { replaceState: true });
          return true;
        } else {
          console.log('⚠️ Last visited collection no longer exists');
        }
      }
      
      // No valid last visited location - don't redirect, let user stay on /app
      console.log('ℹ️ No valid last visited location, staying on app page');
      return false;
    } catch (error) {
      console.error('Failed to redirect to last visited location:', error);
      return false;
    }
  }

  /**
   * Check if we should redirect to last visited location
   * Returns true if there's a valid last visited container or collection
   */
  static async shouldRedirectToLastVisited(): Promise<boolean> {
    try {
      // Check for last visited container first
      const lastVisitedContainerId = await UserService.getLastVisitedContainerId();
      if (lastVisitedContainerId) {
        const containerCollectionId = await UserService.getContainerCollection(lastVisitedContainerId);
        if (containerCollectionId) {
          return true;
        }
      }
      
      // Check for last visited collection
      const lastVisitedCollectionId = await UserService.getLastVisitedCollectionId();
      if (lastVisitedCollectionId) {
        const userCollections = await CollectionService.getCollections();
        const exists = userCollections.some(c => c.id === lastVisitedCollectionId);
        return exists;
      }
      
      return false;
    } catch (error) {
      console.warn('Could not check last visited location:', error);
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