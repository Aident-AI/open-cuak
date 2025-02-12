// child-process-mock.js

export const exec = function mockExec(command, callback) {
  // Your mock logic here...
  setTimeout(() => {
    if (command === 'some command that fails') {
      callback(new Error('Command failed!'), null);
    } else {
      callback(null, 'Mocked output for the command');
    }
  }, 100);
};

export const spawn = (command, args, options) => {
  console.warn('child_process.spawn is not supported in the browser', command, args, options);
  // You can return a dummy value or throw an error here if needed
  return {};
};

export const spawnSync = (command, args, options) => {
  console.warn('child_process.spawn is not supported in the browser', command, args, options);
  // You can return a dummy value or throw an error here if needed
  return {};
};

const childProcessMock = {};

export default childProcessMock;
