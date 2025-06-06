
import { createRoomCreationModule } from './room/roomCreation';
import { createRoomOperationsModule } from './room/roomOperations';
import { createRoomManagementModule } from './room/roomManagement';
import { createRoomAffiliationsModule } from './room/roomAffiliations';
import { createRoomOwnershipModule } from './room/roomOwnership';

export const createRoomModule = (set: any, get: any) => ({
  ...createRoomCreationModule(set, get),
  ...createRoomOperationsModule(set, get),
  ...createRoomManagementModule(set, get),
  ...createRoomAffiliationsModule(set, get),
  ...createRoomOwnershipModule(set, get)
});
