import React from "react";
import { useState } from "react";

import { Button, Input, Divider, Statistic } from "antd";

import PlantoidABI from "../contracts/plantoid";

const { ethers } = require("ethers");

const { Countdown } = Statistic;

export default function Proposals({ plantoidAddress, userSigner, user, graphData, round, roundState }) {
  const [message, setMessage] = useState("");

  const handleChange = event => {
    setMessage(event.target.value);
    console.log("value is:", event.target.value);
  };

  const proposalsList = graphData?.round?.proposals;
  const winningProposal = graphData?.round?.winningProposal;
  const proposalEnd = graphData?.round?.proposalEnd;
  const graceEnd = graphData?.round?.graceEnd;
  const totalVotes = graphData?.round?.totalVotes;
  const votingEnd = graphData?.round?.votingEnd;
  const proposalCount = graphData?.round?.proposals.length || 0;

  const onFinish = () => {
    console.log("finished!");
  };

  console.log({ graphData, totalVotes, roundState, proposalEnd, graceEnd });
  return (
    <div>
      # of Rounds : {round?.toString()} <br /># of Proposals : {proposalCount.toString()}
      <Divider />
      {roundState === 1 && (
        <div>
          <Countdown title="Countdown" value={proposalEnd ? parseInt(proposalEnd) * 1000 : 0} onFinish={onFinish} />
          <Input onChange={handleChange}></Input>
          <Button
            disabled={!message}
            onClick={() => {
              // prosposalsList ? console.log("proposal 0 -------> " + proposalsList[0]) : null;
              console.log(plantoidAddress);
              console.log(message);
              submitProposal(plantoidAddress, userSigner, message);
            }}
          >
            {" "}
            Submit Proposal
          </Button>
          <Divider />
          {proposalsList?.map(prop => {
            console.log({ prop });

            if (prop[0] === 0) {
              return <div />;
            } else {
              console.log({ prop });
              return (
                // <div />
                <div>
                  {/* {`${prop.round}, ${prop[1].substring(0, 7)}..., ${prop[2]}`} */}
                  {`${prop.id}, ${prop.uri}`}
                </div>
              );
            }
          })}
        </div>
      )}
      {roundState === 6 && (
        <Button
          onClick={() => {
            console.log(plantoidAddress);
            advanceRound(plantoidAddress, userSigner);
          }}
        >
          Advance
        </Button>
      )}
      {roundState === 7 && (
        <Button
          onClick={() => {
            console.log(plantoidAddress);
            settleRound(plantoidAddress, userSigner);
          }}
        >
          Settle
        </Button>
      )}
      {roundState === 4 && (
        <div>
          <span>{winningProposal.proposer}</span>
        </div>
      )}
      {roundState === 2 ? (
        <div>
          <Countdown title="Countdown" value={votingEnd ? parseInt(votingEnd) * 1000 : 0} onFinish={onFinish} />
          {proposalsList?.map(prop => {
            console.log({ prop });

            if (prop[0] === 0) {
              return <div />;
            } else {
              console.log({ prop });
              return (
                // <div />
                <div>
                  {/* {`${prop.round}, ${prop[1].substring(0, 7)}..., ${prop[2]}`} */}
                  {`${prop.id}, ${prop.uri}`}
                  -- votes: {(prop.voteCount / totalVotes) * 100} %
                  <Button
                    onClick={async () => {
                      submitVote(plantoidAddress, userSigner, prop);
                    }}
                  >
                    vote
                  </Button>
                </div>
              );
            }
          })}
        </div>
      ) : null}
      {roundState === 3 ? (
        <div>
          <Countdown title="Countdown" value={graceEnd ? parseInt(graceEnd) * 1000 : 0} onFinish={onFinish} />
        </div>
      ) : null}
    </div>
  );
}

const submitProposal = async (plantoidAddress, userSigner, msg) => {
  try {
    const plantoid = new ethers.Contract(plantoidAddress, PlantoidABI, userSigner);
    await plantoid.submitProposal(msg);
  } catch (error) {
    console.log({ error });
  }
};

const advanceRound = async (plantoidAddress, userSigner) => {
  try {
    const plantoid = new ethers.Contract(plantoidAddress, PlantoidABI, userSigner);
    await plantoid.advanceRound();
  } catch (error) {
    console.log({ error });
  }
};

const settleRound = async (plantoidAddress, userSigner) => {
  try {
    const plantoid = new ethers.Contract(plantoidAddress, PlantoidABI, userSigner);
    await plantoid.settleRound();
  } catch (error) {
    console.log({ error });
  }
};

const submitVote = async (plantoidAddress, userSigner, prop) => {
  console.log("voting on prop " + prop.proposalId);

  try {
    const plantoid = new ethers.Contract(plantoidAddress, PlantoidABI, userSigner);
    //const votokens = Array.from({length: tokens[user] || 1}, (_, i) => i + 1) ;
    //console.log({votokens, prop});
    await plantoid.submitVote(prop.proposalId);
  } catch (error) {
    console.log({ error });
  }
};
