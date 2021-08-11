import axios from 'axios';
import Web3 from 'web3';
// import { AbiItem } from 'web3-utils';
import ERC20ABI from './erc20.abi.json';
import BigNumber from 'bignumber.js';

console.log('given provider', Web3.givenProvider);

const SDAO_TOKEN = '0x993864e43caa7f7f12953ad6feb1d1ca635b875f';
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
    'wss://mainnet.infura.io/ws/v3/f992eab8e1244dc793cf14073f01e7ae'
  )
);

const fetchTokenPriceUSD = async (tokenAddress: string) => {
  const query = `query TokenPrice($tokenAddress: Bytes!){
    bundle(id:1){
      ethPrice
    }
    token(id: $tokenAddress){
      derivedETH
    }
  }
  `;
  const queryResponse = await axios.post(
    'https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2',
    {
      query,
      variables: { tokenAddress },
    }
  );

  const bundle: string = queryResponse.data.data.bundle.ethPrice;
  const derivedETH: string = queryResponse.data.data.token.derivedETH;

  const usdValue = new BigNumber(bundle)
    .multipliedBy(derivedETH)
    .decimalPlaces(2)
    .toString();
  return usdValue;
};

const FarmToken = '0xDa9C2064687Ff02e1331EFB39D1Be0bC5DB600F6';
console.log('FARMToken', FarmToken);

const calculateStakeAPY = async (sdaoUSD: string): Promise<string> => {
  //@ts-ignore
  const sdaoStakeContract = new web3.eth.Contract(ERC20ABI, SDAO_STAKE_TOKEN);
  const [balance, decimals] = await Promise.all([
    sdaoStakeContract.methods['balanceOf'](FarmToken).call(),
    sdaoStakeContract.methods['decimals']().call(),
  ]);
  const stakedBalance = toFraction(balance, decimals);
  const stakedUSD = stakedBalance.multipliedBy(sdaoUSD);
  const apy = new BigNumber(SDAO_STAKE_YEARLY_REWARDS)
    .multipliedBy(sdaoUSD)
    .dividedBy(stakedUSD)
    .multipliedBy(100)
    .decimalPlaces(4)
    .toString();
  return apy;
};

interface IFarmAPYResult {
  reserveUSD: string;
  totalSupply: string;
  apy: string;
  stakedBalance: string;
  unitReserve: string;
}

const calculateFarmAPY = async (
  tokenAddress: string,
  yearlyRewards: number,
  sdaoUSD: string
): Promise<IFarmAPYResult | void> => {
  const query = `query Pair($tokenAddress: Bytes!){
    pair(id: $tokenAddress){
      id
      reserveUSD
      totalSupply
    }
  }`;

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
      .multipliedBy(sdaoUSD)
      .dividedBy(unitReserve)
      .multipliedBy(100);
    // console.log('APY of ', name, 'is', apy.toString());
    return {
      apy: apy.decimalPlaces(4).toString(),
      reserveUSD: reserveUSD.decimalPlaces(4).toString(),
      totalSupply: totalSupply.decimalPlaces(4).toString(),
      stakedBalance: stakedBalance.decimalPlaces(4).toString(),
      unitReserve: unitReserve.decimalPlaces(4).toString(),
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
    yearlyRewards: 91341.25,
    name: 'SDAO-USDT',
  },
  {
    tokenAddress: '0x4bb0925fa50da9b4c8936869433b48e78ccc5c13',
    yearlyRewards: 91341.25,
    name: 'AGIX-USDT',
  },
];

const main = async () => {
  const sdaoUSD = await fetchTokenPriceUSD(SDAO_TOKEN);
  // console.log('sdaoUSD', sdaoUSD);
  pools.map(async pool => {
    const result = await calculateFarmAPY(
      pool.tokenAddress,
      pool.yearlyRewards,
      sdaoUSD
    );
    console.log('POOL =>', pool.name);
    console.table(result);
  });
  const sdaoStakeApy = await calculateStakeAPY(sdaoUSD);
  console.log('STAKE APY', sdaoStakeApy);
};

main();
