# Calculate APY

Update the below values in the code before running the script.

```
const SDAO_STAKE_YEARLY_REWARDS = 1214720; // Yearly rewards
```

The script will use [`Uniswap V2 Graph API`](https://docs.uniswap.org/protocol/V2/reference/API/overview) to fetch the latest price of SDAO in USD 
and also the other liquidity pool data required for calculating the APY.

## Install the dependencies

```shell
yarn
```

## Calculate APY
```shell
yarn calculate
```
