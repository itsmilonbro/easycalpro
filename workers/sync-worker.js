/**
 * Sync Worker - Handles background data synchronization
 * Runs in a separate thread to sync data when online
 */

// Message handler for receiving messages from main thread
self.onmessage = function(event) {
    const { action, data } = event.data;
    
    switch (action) {
        case 'SYNC_EXPIRY_DATA':
            syncExpiryData(data);
            break;
            
        case 'SYNC_USERS':
            syncUsers(data);
            break;
            
        case 'SYNC_PAYMENTS':
            syncPayments(data);
            break;
            
        case 'SYNC_NOTIFICATIONS':
            syncNotifications(data);
            break;
            
        case 'SYNC_ALL':
            syncAllData(data);
            break;
            
        case 'CHECK_SYNC_STATUS':
            checkSyncStatus();
            break;
            
        case 'CLEAR_SYNC_QUEUE':
            clearSyncQueue();
            break;
    }
};

// Sync expiry data
async function syncExpiryData(userData) {
    try {
        // Get pending expiry updates from IndexedDB
        const pendingUpdates = await getPendingExpiryUpdates();
        
        if (pendingUpdates.length === 0) {
            postMessage({
                type: 'SYNC_COMPLETE',
                data: { type: 'expiry', message: 'No pending updates' }
            });
            return;
        }
        
        // Process each update
        let syncedCount = 0;
        let failedCount = 0;
        
        for (const update of pendingUpdates) {
            try {
                // Simulate API call to sync expiry data
                const success = await syncExpiryToServer(update);
                
                if (success) {
                    // Remove from pending queue
                    await removePendingUpdate(update.id);
                    syncedCount++;
                    
                    // Notify main thread of progress
                    postMessage({
                        type: 'SYNC_PROGRESS',
                        data: {
                            type: 'expiry',
                            synced: syncedCount,
                            total: pendingUpdates.length,
                            current: update
                        }
                    });
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error('Failed to sync expiry update:', error);
                failedCount++;
            }
        }
        
        // Send completion message
        postMessage({
            type: 'SYNC_COMPLETE',
            data: {
                type: 'expiry',
                synced: syncedCount,
                failed: failedCount,
                total: pendingUpdates.length
            }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'expiry',
                error: error.message
            }
        });
    }
}

// Sync users data
async function syncUsers(usersData) {
    try {
        // Get offline users from IndexedDB
        const offlineUsers = await getOfflineUsers();
        
        if (offlineUsers.length === 0) {
            postMessage({
                type: 'SYNC_COMPLETE',
                data: { type: 'users', message: 'No users to sync' }
            });
            return;
        }
        
        let syncedCount = 0;
        let failedCount = 0;
        
        for (const user of offlineUsers) {
            try {
                // Check if user exists on server
                const exists = await checkUserExists(user.phone);
                
                if (exists) {
                    // Update existing user
                    const success = await updateUserOnServer(user);
                    
                    if (success) {
                        await markUserAsSynced(user.id);
                        syncedCount++;
                    } else {
                        failedCount++;
                    }
                } else {
                    // Create new user
                    const success = await createUserOnServer(user);
                    
                    if (success) {
                        await markUserAsSynced(user.id);
                        syncedCount++;
                    } else {
                        failedCount++;
                    }
                }
                
                // Send progress update
                postMessage({
                    type: 'SYNC_PROGRESS',
                    data: {
                        type: 'users',
                        synced: syncedCount,
                        total: offlineUsers.length,
                        current: user
                    }
                });
                
            } catch (error) {
                console.error('Failed to sync user:', error);
                failedCount++;
            }
        }
        
        postMessage({
            type: 'SYNC_COMPLETE',
            data: {
                type: 'users',
                synced: syncedCount,
                failed: failedCount,
                total: offlineUsers.length
            }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'users',
                error: error.message
            }
        });
    }
}

// Sync payments data
async function syncPayments(paymentsData) {
    try {
        const pendingPayments = await getPendingPayments();
        
        if (pendingPayments.length === 0) {
            postMessage({
                type: 'SYNC_COMPLETE',
                data: { type: 'payments', message: 'No payments to sync' }
            });
            return;
        }
        
        let syncedCount = 0;
        let failedCount = 0;
        
        for (const payment of pendingPayments) {
            try {
                // Sync payment to server
                const success = await syncPaymentToServer(payment);
                
                if (success) {
                    await markPaymentAsSynced(payment.id);
                    syncedCount++;
                    
                    // Send payment confirmation notification
                    postMessage({
                        type: 'PAYMENT_CONFIRMED',
                        data: {
                            paymentId: payment.id,
                            amount: payment.amount,
                            userId: payment.userId
                        }
                    });
                } else {
                    failedCount++;
                }
                
                // Progress update
                postMessage({
                    type: 'SYNC_PROGRESS',
                    data: {
                        type: 'payments',
                        synced: syncedCount,
                        total: pendingPayments.length
                    }
                });
                
            } catch (error) {
                console.error('Failed to sync payment:', error);
                failedCount++;
            }
        }
        
        postMessage({
            type: 'SYNC_COMPLETE',
            data: {
                type: 'payments',
                synced: syncedCount,
                failed: failedCount,
                total: pendingPayments.length
            }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'payments',
                error: error.message
            }
        });
    }
}

// Sync notifications
async function syncNotifications(notificationsData) {
    try {
        const unsyncedNotifications = await getUnsyncedNotifications();
        
        if (unsyncedNotifications.length === 0) {
            postMessage({
                type: 'SYNC_COMPLETE',
                data: { type: 'notifications', message: 'No notifications to sync' }
            });
            return;
        }
        
        let syncedCount = 0;
        let failedCount = 0;
        
        for (const notification of unsyncedNotifications) {
            try {
                // Sync notification to server
                const success = await syncNotificationToServer(notification);
                
                if (success) {
                    await markNotificationAsSynced(notification.id);
                    syncedCount++;
                } else {
                    failedCount++;
                }
                
            } catch (error) {
                console.error('Failed to sync notification:', error);
                failedCount++;
            }
        }
        
        postMessage({
            type: 'SYNC_COMPLETE',
            data: {
                type: 'notifications',
                synced: syncedCount,
                failed: failedCount,
                total: unsyncedNotifications.length
            }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'notifications',
                error: error.message
            }
        });
    }
}

// Sync all data types
async function syncAllData(syncOptions = {}) {
    const results = {
        expiry: { synced: 0, failed: 0 },
        users: { synced: 0, failed: 0 },
        payments: { synced: 0, failed: 0 },
        notifications: { synced: 0, failed: 0 }
    };
    
    try {
        // Start with expiry data
        await syncExpiryData();
        
        // Sync users if enabled
        if (syncOptions.syncUsers !== false) {
            await syncUsers();
        }
        
        // Sync payments if enabled
        if (syncOptions.syncPayments !== false) {
            await syncPayments();
        }
        
        // Sync notifications if enabled
        if (syncOptions.syncNotifications !== false) {
            await syncNotifications();
        }
        
        // Send final sync complete message
        postMessage({
            type: 'ALL_SYNC_COMPLETE',
            data: { results }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'all',
                error: error.message
            }
        });
    }
}

// Check sync status
async function checkSyncStatus() {
    try {
        const pendingUpdates = await getPendingExpiryUpdates();
        const offlineUsers = await getOfflineUsers();
        const pendingPayments = await getPendingPayments();
        const unsyncedNotifications = await getUnsyncedNotifications();
        
        postMessage({
            type: 'SYNC_STATUS',
            data: {
                pendingUpdates: pendingUpdates.length,
                offlineUsers: offlineUsers.length,
                pendingPayments: pendingPayments.length,
                unsyncedNotifications: unsyncedNotifications.length,
                lastSync: await getLastSyncTime(),
                nextSync: await getNextSyncTime()
            }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'status',
                error: error.message
            }
        });
    }
}

// Clear sync queue
async function clearSyncQueue() {
    try {
        await clearAllPendingData();
        
        postMessage({
            type: 'SYNC_QUEUE_CLEARED',
            data: { message: 'Sync queue cleared successfully' }
        });
        
    } catch (error) {
        postMessage({
            type: 'SYNC_ERROR',
            data: {
                type: 'clear',
                error: error.message
            }
        });
    }
}

// Database helper functions
async function getPendingExpiryUpdates() {
    // This would access IndexedDB
    // For demo, return empty array
    return [];
}

async function getOfflineUsers() {
    // This would access IndexedDB
    // For demo, return empty array
    return [];
}

async function getPendingPayments() {
    // This would access IndexedDB
    // For demo, return empty array
    return [];
}

async function getUnsyncedNotifications() {
    // This would access IndexedDB
    // For demo, return empty array
    return [];
}

async function getLastSyncTime() {
    const lastSync = localStorage.getItem('lastSyncTime');
    return lastSync ? new Date(lastSync) : null;
}

async function getNextSyncTime() {
    const lastSync = await getLastSyncTime();
    if (!lastSync) return new Date();
    
    const nextSync = new Date(lastSync);
    nextSync.setHours(nextSync.getHours() + 1); // Next sync in 1 hour
    return nextSync;
}

// Server sync simulation functions
async function syncExpiryToServer(update) {
    // Simulate API call with 90% success rate
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() < 0.9);
        }, 500);
    });
}

async function checkUserExists(phone) {
    // Simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() < 0.8); // 80% chance user exists
        }, 300);
    });
}

async function updateUserOnServer(user) {
    // Simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() < 0.95);
        }, 400);
    });
}

async function createUserOnServer(user) {
    // Simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() < 0.9);
        }, 600);
    });
}

async function syncPaymentToServer(payment) {
    // Simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() < 0.95);
        }, 700);
    });
}

async function syncNotificationToServer(notification) {
    // Simulate API call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Math.random() < 0.99);
        }, 200);
    });
}

// Database update functions
async function removePendingUpdate(updateId) {
    // Remove from IndexedDB
    console.log('Removing pending update:', updateId);
    return Promise.resolve();
}

async function markUserAsSynced(userId) {
    // Update in IndexedDB
    console.log('Marking user as synced:', userId);
    return Promise.resolve();
}

async function markPaymentAsSynced(paymentId) {
    // Update in IndexedDB
    console.log('Marking payment as synced:', paymentId);
    return Promise.resolve();
}

async function markNotificationAsSynced(notificationId) {
    // Update in IndexedDB
    console.log('Marking notification as synced:', notificationId);
    return Promise.resolve();
}

async function clearAllPendingData() {
    // Clear all pending data from IndexedDB
    console.log('Clearing all pending data');
    return Promise.resolve();
}

// Auto-sync interval (runs every 5 minutes when online)
let syncInterval;

// Start auto-sync when worker loads
if (self.navigator.onLine) {
    startAutoSync();
}

// Listen for online/offline events
self.addEventListener('online', () => {
    console.log('Sync worker: Online, starting auto-sync');
    startAutoSync();
    
    // Trigger immediate sync
    self.postMessage({
        type: 'TRIGGER_SYNC',
        data: { reason: 'came_online' }
    });
});

self.addEventListener('offline', () => {
    console.log('Sync worker: Offline, stopping auto-sync');
    stopAutoSync();
});

function startAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Sync every 5 minutes when online
    syncInterval = setInterval(() => {
        self.postMessage({
            type: 'AUTO_SYNC_TRIGGER',
            data: { timestamp: new Date().toISOString() }
        });
    }, 5 * 60 * 1000); // 5 minutes
}

function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Clean up on termination
self.addEventListener('message', (event) => {
    if (event.data === 'TERMINATE') {
        stopAutoSync();
        self.close();
    }
});

console.log('Sync Worker Loaded and Ready');