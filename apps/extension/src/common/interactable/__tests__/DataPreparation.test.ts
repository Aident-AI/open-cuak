import { describe, expect } from '@jest/globals';
import apiDocSnapshot from '~src/common/interactable/__tests__/mockData/api-doc.snapshot.json';
import chatgptSnapshot from '~src/common/interactable/__tests__/mockData/chatgpt.snapshot.json';
import mockSnapshot from '~src/common/interactable/__tests__/mockData/mock.snapshot.json';

export const getMockSnapshot = () => mockSnapshot;
export const getApiDocSnapshot = () => apiDocSnapshot;
export const getChatgptSnapshot = () => chatgptSnapshot;

describe('Get Snapshot data from JSON', () => {
  const validateSnapshotData = (data: object) => {
    expect(data).toBeDefined();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('backendNodeId');
    expect(data).toHaveProperty('role');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('children');
    expect(data).not.toHaveProperty('parentId');
    expect(data).not.toHaveProperty('childIds');
  };

  it('loads chatgpt snapshot data', () => {
    validateSnapshotData(getChatgptSnapshot());
  });

  it('loads api-doc snapshot data', () => {
    validateSnapshotData(apiDocSnapshot);
  });
});
