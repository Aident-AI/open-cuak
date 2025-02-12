import _ from 'lodash';
import { serializedNodeWithId } from 'rrweb-snapshot';
import { Interactable } from '~src/common/interactable/Interactable';
import { InteractableService } from '~src/common/interactable/InteractableService';
import RRSnapshot_TwitterComments from '~src/common/interactable/__tests__/mockData/twitter-comments.rr-snapshot.json';

const getTwitterCommentsSnapshot = () => RRSnapshot_TwitterComments as unknown as serializedNodeWithId;

describe('Interactable', () => {
  describe('RRDom', () => {
    describe('tree fetching', () => {
      const buildInteractableForFullSnapshot = async () => {
        const snapshot = getTwitterCommentsSnapshot();
        return await Interactable.Dom.createForActiveTab(snapshot);
      };

      beforeAll(() => {
        const mockInteractableServiceIsAttached = jest.spyOn(InteractableService, 'isAttached');
        mockInteractableServiceIsAttached.mockReturnValue(true);
      });

      it('fetchesFullTree', async () => {
        const it = await buildInteractableForFullSnapshot();
        const tree = await it.fetchFullTree();
        const tree2 = await it.fetchNodeTree(undefined, {});

        expect(tree).toBeDefined();
        expect(tree2).toBeDefined();
        expect(_.isEqual(tree, tree2)).toBeTruthy();
      });

      it('fetchViewTree', async () => {
        const it = await buildInteractableForFullSnapshot();
        const tree = await it.fetchViewTree();
        const tree2 = await it.fetchFullTree();

        expect(tree).toBeDefined();
        expect(tree2).toBeDefined();
        expect(_.isEqual(tree, tree2)).toBeFalsy();
        const treeString = JSON.stringify(tree);
        expect(treeString.includes('Me: who only design in figma ;-;')); // A comment in view
        expect(!treeString.includes("How about Next.js for landing pages it's good with SEO and optimisation!!")); // A comment in the bottom of the page, inView is false.
      });
    });
  });
});
