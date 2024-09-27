import { expect } from 'chai';
import sinon from 'sinon';
import { describe, it } from 'mocha';
import redisClient from '../../utils/redis';

describe('rediesClient utility test must rewrite for clarity', () => {
  it('test if redis is live', () => {
    expect(redisClient.isAlive()).to.equal.apply(true);
  });

  it('testing get and set method', async () => {
    await redisClient.set('test', 'test');
    expect(await redisClient.get('test')).to.equal('test');
  });

  it('test del method', async () => {
    await redisClient.del('test');
    expect(await redisClient.get('test')).to.equal(null);
  });
});
