import { NodeType, documentNode, elementNode, serializedNodeWithId } from 'rrweb-snapshot';
import { IInteractable } from '~shared/interactable/IInteractable';
import { IgnoredTags, InteractableNodeImpl } from '~shared/interactable/InteractableNodeImpl';
import { InteractableNodeRole } from '~shared/interactable/InteractableNodeRole';
import { InteractableObject } from '~shared/interactable/InteractableObject';
import { INodeId, RRNodeType, spellOutRRNodeType } from '~shared/interactable/types';
import { Interactable } from '~src/common/interactable/Interactable';
import { InteractableService } from '~src/common/interactable/InteractableService';
import RRSnapshot_ChatGPT4 from '~src/common/interactable/__tests__/mockData/chatgpt-4.rr-snapshot.json';
import RRSnapshot_GithubCommit from '~src/common/interactable/__tests__/mockData/github-repo-commit.rr-snapshot.json';
import RRSnapshot_GoogleHomepage from '~src/common/interactable/__tests__/mockData/google-homepage.rr-snapshot.json';
import RRSnapshot_GoogleSearchResult from '~src/common/interactable/__tests__/mockData/google-search-result.rr-snapshot.json';
import RRSnapshot_LilianWengBlog from '~src/common/interactable/__tests__/mockData/lilian-weng-blog.rr-snapshot.json';
import RRSnapshot_MockFull from '~src/common/interactable/__tests__/mockData/mock.rr-snapshot.full.json';
import RRSnapshot_MockView from '~src/common/interactable/__tests__/mockData/mock.rr-snapshot.view.json';
import RRSnapshot_PaulGrahamBlog from '~src/common/interactable/__tests__/mockData/paul-graham-blog.rr-snapshot.json';
import RRSnapshot_TwitterHomepage from '~src/common/interactable/__tests__/mockData/twitter-homepage.rr-snapshot.json';

const getViewSnapshot = () => RRSnapshot_MockView as unknown as serializedNodeWithId;
const getFullSnapshot = () => RRSnapshot_MockFull as unknown as serializedNodeWithId;
const getGoogleHomepageSnapshot = () => RRSnapshot_GoogleHomepage as unknown as serializedNodeWithId;
const getGoogleSearchResultSnapshot = () => RRSnapshot_GoogleSearchResult as unknown as serializedNodeWithId;
const getChatGPT4Snapshot = () => RRSnapshot_ChatGPT4 as unknown as serializedNodeWithId;
const getLilianWengBlogSnapshot = () => RRSnapshot_LilianWengBlog as unknown as serializedNodeWithId;
const getPaulGrahamBlogSnapshot = () => RRSnapshot_PaulGrahamBlog as unknown as serializedNodeWithId;
const getTwitterHomepageSnapshot = () => RRSnapshot_TwitterHomepage as unknown as serializedNodeWithId;
const getGithubRepoCommitSnapshot = () => RRSnapshot_GithubCommit as unknown as serializedNodeWithId;

describe('Interactable', () => {
  beforeAll(() => {
    const mockInteractableServiceIsAttached = jest.spyOn(InteractableService, 'isAttached');
    mockInteractableServiceIsAttached.mockReturnValue(true);
  });

  describe('Load Snapshot from JSON', () => {
    const validateMock = (mock: serializedNodeWithId) => {
      expect(mock).toBeDefined();
      expect(mock).toHaveProperty('id');
      expect(mock.id).toBe(1);
      expect(mock).toHaveProperty('type');
      expect(mock.type).toBe(NodeType.Document);
      expect(mock).toHaveProperty('childNodes');
      expect((mock as documentNode).childNodes.length).toBe(2);
    };

    it('loads a view snapshot from json', () => validateMock(getViewSnapshot()));
    it('loads a full snapshot from json', () => validateMock(getFullSnapshot()));
  });

  describe('RRDom', () => {
    describe('createForTab', () => {
      const buildAndValidateFromMock = async (mock: serializedNodeWithId) => {
        const interactable = await Interactable.Dom.createForActiveTab(mock);

        expect(interactable).toBeDefined();
        expect(interactable.uuid).toBeDefined();
        expect(interactable.updatedAt).toBeDefined();
        expect(interactable.isReady()).toBeTruthy();
        expect(interactable.isLoading()).toBeFalsy();

        // meta
        expect(interactable.meta).toBeDefined();
        expect(interactable.meta.documentType).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docType = interactable.meta.documentType as any;
        expect(docType.name).toBe('html');
        expect(docType.publicId).toBeUndefined();
        expect(docType.systemId).toBeUndefined();
        if (interactable.meta.charset) expect(interactable.meta.charset).toBe('utf-8');
        if (interactable.meta.description) expect((interactable.meta.description as string).length).toBeGreaterThan(0);
        if (interactable.meta['twitter:site'])
          expect((interactable.meta['twitter:site'] as string).length).toBeGreaterThan(0);
        if (interactable.meta.title) expect((interactable.meta.title as string).length).toBeGreaterThan(0);

        const root = interactable.getRoot();
        expect(root).toBeDefined();
        expect(root.iNodeId).not.toBe('1');
        expect(root.iNodeId).toBe('3');
        expect(root.parent).toBeNull();
        expect(root.type).toBe(NodeType.Element);
        expect(root.typeString).toBe(spellOutRRNodeType(RRNodeType.Element));
        expect(root.children.length).toBeGreaterThan(0);

        const child0 = root.children[0];
        expect(child0.parent).toBe(root);
        expect(child0.type).toBe(NodeType.Element);
        expect(child0.typeString).toBe(spellOutRRNodeType(RRNodeType.Element));
      };

      it('builds interactable from view snapshot', async () => await buildAndValidateFromMock(getViewSnapshot()));
      it('builds interactable from full snapshot', async () => await buildAndValidateFromMock(getFullSnapshot()));
    });

    describe('tree fetching', () => {
      const buildInteractableForFullSnapshot = async () => {
        const mock = getFullSnapshot();
        return await Interactable.Dom.createForActiveTab(mock);
      };

      beforeAll(() => {
        const mockInteractableServiceIsAttached = jest.spyOn(InteractableService, 'isAttached');
        mockInteractableServiceIsAttached.mockReturnValue(true);
      });

      it('fetches node tree', async () => {
        const it = await buildInteractableForFullSnapshot();
        const tree = await it.fetchNodeTree();

        expect(tree).toBeDefined();
        expect(tree).toHaveProperty('id');
        expect(tree.id).toBe('3');
        expect(tree).toHaveProperty('role');
        expect(tree.role).toBe('section');
        expect(tree).toHaveProperty('children');
        expect(tree.children?.length).toBeGreaterThan(0);
        expect(tree).not.toHaveProperty('inView');

        expect(tree).toHaveProperty('boundingBox');
        expect(tree.boundingBox).not.toBe('none');
        if (!tree.boundingBox || tree.boundingBox === 'none') throw new Error('Bounding box is none');
        expect(tree.boundingBox).toHaveProperty('x');
        expect(String(tree.boundingBox.x)).toMatch(/^\d+(\.\d{1,2})?$|^\d+$/);
        expect(tree.boundingBox).toHaveProperty('y');
        expect(String(tree.boundingBox.y)).toMatch(/^\d+(\.\d{1,2})?$|^\d+$/);
        expect(tree.boundingBox).toHaveProperty('h');
        expect(String(tree.boundingBox.h)).toMatch(/^\d+(\.\d{1,2})?$|^\d+$/);
        expect(tree.boundingBox).toHaveProperty('w');
        expect(String(tree.boundingBox.w)).toMatch(/^\d+(\.\d{1,2})?$|^\d+$/);
      });
    });
  });

  describe('RRNode', () => {
    const fetchMockNode = async (id: number | string, type: 'view' | 'full'): Promise<IInteractable.Node> => {
      const mock = type === 'view' ? getViewSnapshot() : getFullSnapshot();
      const interactable = await Interactable.Dom.createForActiveTab(mock);
      const target = interactable.getNodeById(typeof id === 'string' ? id : id.toString());
      if (!target) throw new Error(`Node ${id} not found`);
      return target;
    };

    describe('toObject', () => {
      it('converts `element` node to InteractableObject.Node properly', async () => {
        const id = '3';
        const node = await fetchMockNode(id, 'view');
        const object = node.toObject();

        expect(object).toBeDefined();
        expect(object.iNodeId).toBeUndefined();
        expect(object.id).toBe(id);
        expect(object.parentId).toBeUndefined();
        expect(object.childIds?.length).toBe(4);
        expect(object.boundingBox).toBeDefined();
        expect(object.boundingBox).toHaveProperty('x');
        expect(object.boundingBox).toHaveProperty('y');
        expect(object.boundingBox).toHaveProperty('h');
        expect(object.boundingBox).toHaveProperty('w');
        expect(object.inView).toBeUndefined();

        expect(object.name).toBeUndefined();
        expect(object.attr).toBeUndefined();
        expect(object.role).toBe('section');
        expect(node.getTag()).toBe((node.rawData as unknown as elementNode).tagName);
      });

      it('converts <header> node to InteractableObject.Node properly', async () => {
        const id = '4BmSub3f';
        const node = await fetchMockNode(id, 'view');
        const object = node.toObject();

        expect(object).toBeDefined();
        expect(object.iNodeId).toBeUndefined();
        expect(object.id).toBe(id);
        expect(object.parentId).toBe('3');
        expect(object.childIds?.length).toBe(2);
        expect(object.boundingBox).toBeDefined();
        expect(object.boundingBox).toHaveProperty('x');
        expect(object.boundingBox).toHaveProperty('y');
        expect(object.boundingBox).toHaveProperty('h');
        expect(object.boundingBox).toHaveProperty('w');
        expect(object.inView).toBeTruthy();
        expect(object.name).toBeUndefined();
        expect(object.attr).toBeUndefined();

        const raw = node.rawData as unknown as elementNode;
        expect(object.role).toBe(InteractableNodeRole.HEADER);
        expect(node.getTag()).toBe(raw.tagName);
        expect(raw.attributes).toHaveProperty('class');
      });

      it('converts <main> node to InteractableObject.Node properly', async () => {
        const id = '34-Wnpj9';
        const node = await fetchMockNode(id, 'view');
        const object = node.toObject();

        expect(object).toBeDefined();
        expect(object.iNodeId).toBeUndefined();
        expect(object.id).toBe(id);
        expect(object.parentId).toBe('3');
        expect(object.childIds?.length).toBe(2);
        expect(object.boundingBox).toBeDefined();
        expect(object.boundingBox).toHaveProperty('x');
        expect(object.boundingBox).toHaveProperty('y');
        expect(object.boundingBox).toHaveProperty('h');
        expect(object.boundingBox).toHaveProperty('w');
        expect(object.inView).toBeTruthy();
        expect(object.name).toBeUndefined();
        expect(object.attr).toBeUndefined();

        const raw = node.rawData as unknown as elementNode;
        expect(object.role).toBe('section');
        expect(node.getTag()).toBe(raw.tagName);
        expect(raw.attributes).toHaveProperty('class');
      });

      it('removes in-middle <div> node properly', async () => {
        const id = 'hhJHupcA';
        try {
          await fetchMockNode(id, 'view');
        } catch (e) {
          expect(e).toBeDefined();
          expect((e as Error).message).toBe(`Node ${id} not found`);
        }
      });

      it('converts <p> node to InteractableObject.Node properly', async () => {
        const id = 'tylx4kg2';
        const node = await fetchMockNode(id, 'view');
        const object = node.toObject();

        expect(object).toBeDefined();
        expect(object.iNodeId).toBeUndefined();
        expect(object.id).toBe(id);
        expect(object.parentId).toBe('ezCWTJSd');
        expect(object.childIds).toBeUndefined();
        expect(object.boundingBox).toBeDefined();
        expect(object.boundingBox).toHaveProperty('x');
        expect(object.boundingBox).toHaveProperty('y');
        expect(object.boundingBox).toHaveProperty('h');
        expect(object.boundingBox).toHaveProperty('w');
        expect(object.inView).toBeTruthy();

        expect(object.name).toBeUndefined();
        expect(object.attr).toBeDefined();
        expect(object.attr).toHaveProperty('text');

        const raw = node.rawData as unknown as elementNode;
        expect(raw).toHaveProperty('attributes');
        expect(object.role).toBe('paragraph');
        expect(node.getTag()).toBe(raw.tagName);
        expect(raw.attributes).toHaveProperty('class');
      });

      it('converts <a> node to InteractableObject.Node properly', async () => {
        const id = 'In6xLO6R';
        const node = await fetchMockNode(id, 'view');
        const object = node.toObject();

        expect(object).toBeDefined();
        expect(object.iNodeId).toBeUndefined();
        expect(object.id).toBe(id);
        expect(object.parentId).toBe('GnYJyuD9');
        expect(object.childIds).toBeUndefined();
        expect(object.boundingBox).toBeDefined();
        expect(object.boundingBox).toHaveProperty('x');
        expect(object.boundingBox).toHaveProperty('y');
        expect(object.boundingBox).toHaveProperty('h');
        expect(object.boundingBox).toHaveProperty('w');
        expect(object.inView).toBeTruthy();

        const raw = node.rawData as unknown as elementNode;
        expect(object.role).toBe('link');
        expect(node.getTag()).toBe('a');
        expect(raw.attributes).toHaveProperty('class');
        expect(raw.attributes).toHaveProperty('href');
        expect(object.name).toBeUndefined();
        expect(object.attr).toBeDefined();
        expect(object.attr).toHaveProperty('text');
        expect(object.clickable).toBeTruthy();
      });

      it('converts leaf section node to InteractableObject.Node properly', async () => {
        const id = 'zLiafpk3';
        const node = await fetchMockNode(id, 'full');
        const object = node.toObject();

        expect(object).toBeDefined();
        expect(object.iNodeId).toBeUndefined();
        expect(object.id).toBe(id);
        expect(object.parentId).toBe('u46HgkTr');
        expect(object.childIds).toBeUndefined();
        expect(object.boundingBox).toBeDefined();
        expect(object.boundingBox).toHaveProperty('x');
        expect(object.boundingBox).toHaveProperty('y');
        expect(object.boundingBox).toHaveProperty('h');
        expect(object.boundingBox).toHaveProperty('w');
        expect(object.inView).toBeTruthy();

        expect(object.name).toBeUndefined();
        expect(object.attr).toBeDefined();
        expect(object.attr).toHaveProperty('text');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((object.attr as any).text.trim().length).toBeGreaterThan(0);

        expect(node.rawData).toHaveProperty('attributes');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((node.rawData as any).attributes).toHaveProperty('class');
        expect(node.attr).not.toHaveProperty('class');

        expect(object.role).toBe('link');
        expect(node.getTag()).toBe('a');
      });
    });

    describe('toTree', () => {
      const validate = async (mock: serializedNodeWithId, expectedNodeCounter: Record<string, number>) => {
        const interactable = await Interactable.Dom.createForActiveTab(mock);
        const root = interactable.getRoot();
        const getRRNode = (id: INodeId) => interactable.getNodeById(id) as InteractableNodeImpl;
        const id = root.iNodeId;
        const tree = root.toTree();

        expect(root.getInteractable().uuid).toBe(interactable.uuid);
        expect(root.getInteractable().updatedAt).toBe(interactable.updatedAt);
        expect(tree.id).toBe(id);
        expect(tree).toHaveProperty('children');
        expect(tree.children?.length).toBeGreaterThan(0);

        const counter: Record<string, number> = {};
        const traverseTree = (node: InteractableObject.TreeNode) => {
          if (!node.role) throw new Error('Role is missing');

          if (node.role in counter) counter[node.role] += 1;
          else counter[node.role] = 1;
          const rrNode = getRRNode(node.id);
          if (!rrNode) throw new Error(`Node ${node.id} not found`);

          expect(node).toBeDefined();
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('role');
          expect(node).not.toHaveProperty('attr');
          expect(node).not.toHaveProperty('name');
          expect(node.role).not.toBe(spellOutRRNodeType(RRNodeType.Comment));
          expect(node.role).not.toBe(spellOutRRNodeType(RRNodeType.CDATA));
          const unwantedRoles = ['meta', 'title'].concat([...IgnoredTags]);
          unwantedRoles.forEach((role) => expect(rrNode.getTag()).not.toBe(role));
          if (node.role === InteractableNodeRole.SVG) expect(node).not.toHaveProperty('children');
          if (node.role === InteractableNodeRole.LINK) {
            if (rrNode.clickable) {
              expect(node.clickable).toBeTruthy();
              expect(node.href).toBeUndefined();
            }
          }
          if (node?.label) {
            expect(typeof node.label).toBe('string');
            expect((node.label as string).length).toBeGreaterThan(0);
          }
          if (rrNode.isCompressibleContainer()) {
            const text = node?.text;
            if (text && typeof text === 'string') {
              expect(text.trim().length).toBeGreaterThan(0);
              expect(node.children).toBeUndefined();
            } else {
              expect(node.children).toBeDefined();
              if (!rrNode.isRoot()) expect(node.children!.length).toBeGreaterThan(1);
            }
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const aria = (rrNode.attr as any)?.aria as Record<string, any>;
          if (aria) {
            expect(node.aria).toBeUndefined();
            if (aria.role) {
              expect(node['aria-role']).toBe(aria.role);
              if (rrNode.role !== aria.role) expect(node.role).not.toBe(aria.role);
            }
          }

          if ('children' in node) expect(node.children!.length).toBeGreaterThan(0);
          if ('boundingBox' in node) {
            expect(node.boundingBox).toHaveProperty('x');
            expect(node.boundingBox).toHaveProperty('y');
            expect(node.boundingBox).toHaveProperty('w');
            expect(node.boundingBox).toHaveProperty('h');
          }
          node.children?.forEach((n) => traverseTree(n as InteractableObject.TreeNode));

          if (rrNode.type === RRNodeType.Element) {
            expect(node).not.toHaveProperty('attributes');
            expect(rrNode.attr).not.toHaveProperty('class');
          }
        };

        traverseTree(tree);
        expect(Object.keys(counter).length).toBe(Object.keys(expectedNodeCounter).length);
        Object.entries(counter).forEach(([role, count]) => {
          expect(expectedNodeCounter).toHaveProperty(role);
          expect(expectedNodeCounter[role]).toBe(count);
        });
      };

      it('converts view root to TreeNode properly', async () =>
        await validate(getViewSnapshot(), {
          footer: 2,
          header: 1,
          heading: 2,
          image: 3,
          input: 2,
          label: 2,
          link: 31,
          navigation: 4,
          paragraph: 1,
          section: 14,
          svg: 3,
          text: 5,
        }));

      it('converts full root to TreeNode properly', async () =>
        await validate(getFullSnapshot(), {
          button: 4,
          footer: 2,
          form: 1,
          header: 2,
          heading: 8,
          image: 5,
          input: 4,
          label: 3,
          link: 102,
          navigation: 5,
          paragraph: 19,
          section: 190,
          svg: 16,
          text: 23,

          unknown: 7,
        }));

      it('converts google homepage to TreeNode properly', async () =>
        await validate(getGoogleHomepageSnapshot(), {
          'video-source': 1,
          button: 2,
          dialog: 1,
          form: 1,
          iframe: 1,
          image: 13,
          input: 17,
          link: 19,
          navigation: 1,
          section: 60,
          svg: 13,
          text: 3,

          unknown: 15,
        }));

      it('converts google search result to TreeNode properly', async () =>
        await validate(getGoogleSearchResultSnapshot(), {
          'c-data': 1,
          button: 5,
          form: 2,
          header: 1,
          heading: 28,
          iframe: 2,
          image: 51,
          input: 14,
          label: 3,
          link: 105,
          list: 1,
          navigation: 1,
          section: 458,
          svg: 65,
          template: 1,
          text: 128,

          unknown: 78,
        }));

      it('converts chatgpt-4 page to TreeNode properly', async () =>
        await validate(getChatGPT4Snapshot(), {
          button: 61,
          form: 1,
          heading: 20,
          iframe: 1,
          image: 1,
          input: 2,
          link: 2,
          list: 23,
          navigation: 4,
          paragraph: 50,
          section: 1324,
          svg: 75,
          text: 1188,

          unknown: 1,
        }));

      it("converts Lilian-Weng's blog page to TreeNode properly", async () =>
        await validate(getLilianWengBlogSnapshot(), {
          button: 7,
          footer: 2,
          header: 2,
          heading: 16,
          image: 13,
          link: 134,
          list: 52,
          navigation: 24,
          paragraph: 97,
          section: 480,
          svg: 9,
          text: 523,

          unknown: 306,
        }));

      it("converts Paul-Graham's blog page to TreeNode properly", async () =>
        await validate(getPaulGrahamBlogSnapshot(), {
          'map-area': 17,
          image: 4,
          link: 59,
          list: 3,
          map: 1,
          section: 1,
          text: 1044,
        }));

      it('converts Twitter Homepage to TreeNode properly', async () =>
        await validate(getTwitterHomepageSnapshot(), {
          'video-source': 5,
          button: 79,
          form: 1,
          header: 1,
          heading: 8,
          image: 26,
          input: 2,
          link: 69,
          navigation: 4,
          section: 261,
          svg: 102,
          text: 13,
          video: 5,

          unknown: 8,
        }));

      it("converts Github Repo's commits page to TreeNode properly", async () =>
        await validate(getGithubRepoCommitSnapshot(), {
          'video-source': 22,
          button: 33,
          canvas: 1,
          dialog: 2,
          footer: 1,
          form: 5,
          header: 1,
          heading: 26,
          image: 59,
          input: 15,
          label: 6,
          link: 127,
          list: 15,
          navigation: 30,
          paragraph: 18,
          section: 216,
          svg: 85,
          template: 37,
          text: 104,
          video: 3,

          unknown: 36,
        }));
    });

    describe('fetchPaginatedTree', () => {
      const validate = async (mock: serializedNodeWithId) => {
        process.env.ENABLE_CONTENT_MUTATION_OBSERVER = 'false';

        const interactable = await Interactable.Dom.createForActiveTab(mock);
        const page = await interactable.fetchPaginatedTree(undefined, false, { skipRefreshing: true });
        expect(page).toBeDefined();
        expect(page).toHaveProperty('tree');
        const tree = page!.tree;
        expect(tree).toBeDefined();

        const fullTree = await interactable.fetchNodeTree();
        function areTreesEqual(a: InteractableObject.TreeNode, b: InteractableObject.TreeNode): void {
          expect(a).toEqual(b);
          a.children?.forEach((child, i) =>
            areTreesEqual(child as InteractableObject.TreeNode, b.children![i] as InteractableObject.TreeNode),
          );
        }
        areTreesEqual(tree, fullTree);
      };

      it('converts view root to paginated tree properly', async () => await validate(getViewSnapshot()));
      it('converts view root to paginated tree properly', async () => await validate(getViewSnapshot()));
      it('converts full root to paginated tree properly', async () => await validate(getFullSnapshot()));
      it('converts google homepage to paginated tree properly', async () =>
        await validate(getGoogleHomepageSnapshot()));
      it('converts google search result to paginated tree properly', async () =>
        await validate(getGoogleSearchResultSnapshot()));
      it('converts chatgpt-4 page to paginated tree properly', async () => await validate(getChatGPT4Snapshot()));
      it("converts Lilian-Weng's blog page to paginated tree properly", async () =>
        await validate(getLilianWengBlogSnapshot()));
      it("converts Paul-Graham's blog page to paginated tree properly", async () =>
        await validate(getPaulGrahamBlogSnapshot()));
      it('converts Twitter Homepage to paginated tree properly', async () =>
        await validate(getTwitterHomepageSnapshot()));
      it("converts Github Repo's commits page to paginated tree properly", async () =>
        await validate(getGithubRepoCommitSnapshot()));
    });

    describe('getNodeBySnapshotNanoid', () => {
      it('returns undefined if the target nanoid is not found in tree', async () => {
        const snapshot = getTwitterHomepageSnapshot();
        const interactable = await Interactable.Dom.createForActiveTab(snapshot);

        const node = interactable.getNodeBySnapshotNanoid('PsGv1MGMw');
        expect(node).toBeUndefined();
      });

      it('returns the node if the target nanoid is valid (parent)', async () => {
        const snapshot = getTwitterHomepageSnapshot();
        const interactable = await Interactable.Dom.createForActiveTab(snapshot);

        const node = interactable.getNodeBySnapshotNanoid('PsGv1MGM');
        expect(node).toBeDefined();
        expect(node!.iNodeId).not.toBe(interactable.getRoot().iNodeId);
        expect(node!.role).toBe('section');
        expect(node!.children.length).toBe(0);
        expect(node!.attr).toBeDefined();
        expect(node!.attr).toHaveProperty('text');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((node!.attr! as any).text).toBe('What’s happening');
      });

      it("returns the node if the target nanoid is valid (parent's parent)", async () => {
        const snapshot = getTwitterHomepageSnapshot();
        const interactable = await Interactable.Dom.createForActiveTab(snapshot);

        const node = interactable.getNodeBySnapshotNanoid('uPELAKo4');
        expect(node).toBeDefined();
        expect(node!.iNodeId).not.toBe(interactable.getRoot().iNodeId);
        expect(node!.role).toBe('section');
        expect(node!.children.length).toBe(0);
        expect(node!.attr).toBeDefined();
        expect(node!.attr).toHaveProperty('text');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((node!.attr! as any).text).toBe('Subscribe');
      });

      it('returns itself if the target nanoid is in the tree (button)', async () => {
        const snapshot = getTwitterHomepageSnapshot();
        const interactable = await Interactable.Dom.createForActiveTab(snapshot);

        const nanoid = '_9SNmdzd';
        const node = interactable.getNodeBySnapshotNanoid(nanoid);
        expect(node).toBeDefined();
        expect(node!.iNodeId).toBe(nanoid);
        expect(node!.iNodeId).not.toBe(interactable.getRoot().iNodeId);
        expect(node!.role).toBe('link');
        expect(node!.children.length).toBe(1);
        expect(node!.attr).toBeDefined();
        expect(node!.attr).not.toHaveProperty('text');
      });
    });
  });
});
