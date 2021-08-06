import axios from 'axios';
import Web3 from 'web3';
// import { AbiItem } from 'web3-utils';
import ERC20ABI from './erc20.abi.json';
import BigNumber from 'bignumber.js';

console.log('given provider', Web3.givenProvider);

const SDAO_USD = 1.9284;
const SDAO_STAKE_TOKEN = '0x993864e43caa7f7f12953ad6feb1d1ca635b875f';
const SDAO_STAKE_YEARLY_REWARDS = '1214720';

type BigNumberish = BigNumber | string | number;
const toFraction = (
  balance: BigNumberish,
  decimals: BigNumberish,
  precision = 8
) => {
  const numerator = new BigNumber(balance);
  const denominator = new BigNumber(10).exponentiatedBy(decimals);
  const value = numerator.dividedBy(denominator);
  // if (precision === Infinity) {
  //   return value.toString();
  // }
  return value.decimalPlaces(precision);
};

const web3 = new Web3(
  new Web3.providers.WebsocketProvider(
    'wss://mainnet.infura.io/ws/v3/ee6afbd4f6fe42e78b68eec31660ec78'
  )
);
export const sum = (a: number, b: number) => {
  if ('development' === process.env.NODE_ENV) {
    console.log(a + b);
    console.log('boop');
  }
  return a + b;
};

const FarmToken = '0xDa9C2064687Ff02e1331EFB39D1Be0bC5DB600F6';
console.log('FARMToken', FarmToken);

const query = `query Pair($tokenAddress: Bytes!){
  pair(id: $tokenAddress){
    id
    reserveUSD
    totalSupply
  }
}`;

const calculateStakeAPY = async (): Promise<string> => {
  //@ts-ignore
  const sdaoStakeContract = new web3.eth.Contract(ERC20ABI, SDAO_STAKE_TOKEN);
  const [balance, decimals] = await Promise.all([
    sdaoStakeContract.methods['balanceOf'](FarmToken).call(),
    sdaoStakeContract.methods['decimals']().call(),
  ]);
  const stakedBalance = toFraction(balance, decimals);
  const stakedUSD = stakedBalance.multipliedBy(SDAO_USD);
  const apy = new BigNumber(SDAO_STAKE_YEARLY_REWARDS)
    .multipliedBy(SDAO_USD)
    .dividedBy(stakedUSD)
    .multipliedBy(100)
    .decimalPlaces(2)
    .toString();
  return apy;
};

interface IFarmAPYResult {
  reserveUSD: string;
  totalSupply: string;
  apy: string;
}

const calculateFarmAPY = async (
  tokenAddress: string,
  yearlyRewards: number
): Promise<IFarmAPYResult | void> => {
  try {
    //@ts-ignore
    const poolTokenContract = new web3.eth.Contract(ERC20ABI, tokenAddress);

    const [queryResponse, balance, decimals]: any[] = await Promise.all([
      axios.post(
        'https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2',
        {
          query,
          variables: { tokenAddress },
        }
      ),

      poolTokenContract.methods['balanceOf'](FarmToken).call(),
      poolTokenContract.methods['decimals']().call(),
    ]);

    let { reserveUSD, totalSupply } = queryResponse.data.data.pair;
    reserveUSD = new BigNumber(reserveUSD);
    totalSupply = new BigNumber(totalSupply);
    // console.log('reserveUSD', queryResponse.data.data.pair);
    // console.log('reserveUSD', reserveUSD);
    // console.log('totalSupply', totalSupply);

    const stakedBalance = toFraction(balance, decimals);

    // console.log('farm balance', balance.toString());

    const unitReserve = stakedBalance
      .multipliedBy(reserveUSD)
      .dividedBy(totalSupply);
    const apy = new BigNumber(yearlyRewards)
      .multipliedBy(SDAO_USD)
      .dividedBy(unitReserve)
      .multipliedBy(100);
    // console.log('APY of ', name, 'is', apy.toString());
    return {
      apy: apy.decimalPlaces(2).toString(),
      reserveUSD: reserveUSD.decimalPlaces(2).toString(),
      totalSupply: totalSupply.decimalPlaces(2).toString(),
    };
  } catch (error) {
    console.log('balance error', error);
  }
};

const pools = [
  {
    tokenAddress: '0x424485f89ea52839fdb30640eb7dd7e0078e12fb',
    yearlyRewards: 152077.25,
    name: 'SDAO-WETH',
  },
  {
    tokenAddress: '0xe45b4a84e0ad24b8617a489d743c52b84b7acebe',
    yearlyRewards: 152077.25,
    name: 'AGIX-WETH',
  },
  {
    tokenAddress: '0x3a925503970d40d36d2329e3846e09fcfc9b6acb',
    yearlyRewards: 152077.25,
    name: 'SDAO-USDT',
  },
  {
    tokenAddress: '0x4bb0925fa50da9b4c8936869433b48e78ccc5c13',
    yearlyRewards: 152077.25,
    name: 'AGIX-USDT',
  },
];

const main = async () => {
  pools.map(async pool => {
    const result = await calculateFarmAPY(
      pool.tokenAddress,
      pool.yearlyRewards
    );
    console.log('POOL =>', pool.name);
    console.table(result);
  });
  const sdaoStakeApy = await calculateStakeAPY();
  console.log('STAKE APY', sdaoStakeApy);
};

main();
